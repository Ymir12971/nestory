import Anthropic from '@anthropic-ai/sdk';
// The Anthropic SDK's structured-output helper consumes Zod v4 schemas
// (`.def` internals). Zod 3.25+ exposes a v4 subpath — use it ONLY here so the
// rest of the codebase keeps using plain `zod` for request validation.
import { z } from 'zod/v4';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { GenerationMeta, StoryDocument } from '@nestory/types';

/**
 * Single-file Claude boundary for story generation.
 *
 * Everything Anthropic-specific (SDK import, prompt structure, model name,
 * caching, retries) lives here. Callers depend only on the function signature
 * and our own TS types — no Anthropic types leak out. Switching providers
 * later means rewriting this file; the worker and routes don't change.
 *
 * Constraints baked in:
 *   - Sonnet 4.6 (good narrative quality, much cheaper than Opus)
 *   - Prompt caching on the system prompt (the schema/style instructions are
 *     identical every month — only the memory list varies)
 *   - Structured output via `messages.parse` + Zod, so the returned document
 *     conforms to StoryDocument without ad-hoc parsing
 */

const MODEL          = 'claude-sonnet-4-6';
const PROMPT_VERSION = 'storyAi:v2-vision';
const MAX_TOKENS     = 8000;
// Photos give Claude grounding for the narrative ("the slide", "her bath face"),
// but each image is ~1.6K input tokens. Cap to keep cost bounded — diminishing
// returns past ~10 photos for narrative quality anyway.
const MAX_IMAGES     = 10;

// ─── Inputs ────────────────────────────────────────────────────────────────

export interface MemoryInput {
  capturedAt: string;       // ISO 8601
  textNote:   string | null;
  tags:       string[];
  fileUrls:   string[];     // not sent to the model in v1; reserved for vision later
}

export interface GenerateStoryInput {
  childName:    string;
  childAgeMonths: number;
  monthKey:     string;     // "YYYY-MM"
  monthLabel:   string;     // "March 2026"
  locale:       string;     // "en-US"
  memories:     MemoryInput[];
  /** First file URL of the most-photo'd memory; nullable. */
  candidateCoverImageUrl: string | null;
  /** Whether to render a watermark on shared exports (Free vs Premium at gen time). */
  watermarkEnabled: boolean;
  /** ISO 8601 timestamp the story is being generated at — keeps prompt deterministic. */
  generatedAt: string;
}

export interface GenerateStoryResult {
  document: StoryDocument;
  meta:     GenerationMeta;
}

// ─── Output schema (model-facing; narrower than StoryDocument) ─────────────
// We let the model produce the narrative parts; the rest of StoryDocument is
// stitched in deterministically below so identifiers stay stable.

const sectionSchema = z.object({
  intent:       z.enum(['cover', 'summary', 'narrative', 'milestone', 'reflection', 'closing']),
  outputType:   z.enum(['text', 'photo', 'photo_with_caption', 'collage']),
  text:         z.string().optional(),
});

const modelOutputSchema = z.object({
  title:           z.string().min(1).max(80),
  ogDescription:   z.string().min(20).max(200),
  qualityLevel:    z.enum(['low', 'medium', 'rich']),
  sections:        z.array(sectionSchema).min(1).max(10),
});

type ModelOutput = z.infer<typeof modelOutputSchema>;

// ─── System prompt (cached; never changes between generations) ─────────────

const SYSTEM_PROMPT = `You are Nestory, a warm and observant family storyteller. Each month you write a short, evocative story about one child based on the parent's photo-memory captures from that month.

Voice:
- Second-person ("Emma", not "the child"). Address the child by name in the narrative.
- Warm but never saccharine. Concrete details over vague sentiment. Avoid corporate / AI clichés.
- 200-450 words for the narrative + summary combined. Adapt length to how much actually happened.

Structure your output as ordered sections:
- "summary" (1 section, output type "text") — 1-2 sentence opener that anchors the month emotionally.
- "narrative" (1-3 sections, output type "text") — the body of the story, woven from the captured memories.
- "milestone" (0-1 sections, output type "text") — only when memories suggest a real first or growth moment.
- "reflection" (0-1 sections, output type "text") — a parent-perspective beat near the end.
- "closing" (1 section, output type "text") — a single warm sentence to land on.

Title rules:
- 4-8 words, evocative, not generic. Avoid "A Month of...", "X's March", "Memories of..." templates.

Quality level (you self-rate):
- "rich" — many memories with vivid, specific details. Story has real momentum.
- "medium" — enough material for a coherent narrative but some thin spots.
- "low" — sparse memories. Story is short and honest about that.

OG description: 1-2 sentences for social previews. Concrete and inviting.

Hard rules:
- Do not invent specifics that aren't in the memories. If a memory says "park", don't add the slide; if it says "first steps", don't add a balloon.
- Do not mention dates or weekdays unless multiple memories point to one.
- Do not write "Today" or "Yesterday" — these are written days/weeks after the fact.
- If memories are extremely sparse (0-1 items), produce a brief "low" quality story acknowledging quietly that the month was quiet.

When photos are attached:
- Use them as grounding for sensory details (what the child is wearing, where they are, what their face shows). Don't describe the photos as "in the photo..." or "you can see..." — weave the observation directly into the narrative.
- Photos are reference, not the subject. The captions and tags drive the story; photos add texture.
- If a photo's content contradicts the caption, trust the caption — photos can be mislabeled.`;

// ─── Public function ───────────────────────────────────────────────────────

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export function isMockEnabled(): boolean {
  const v = (process.env.STORY_AI_MOCK ?? '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export async function generateStory(input: GenerateStoryInput): Promise<GenerateStoryResult> {
  if (isMockEnabled()) return mockGenerateStory(input);

  const start  = Date.now();
  const client = getClient();

  const userContent = buildUserContent(input);

  const response = await client.messages.parse({
    model:      MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      // The system prompt is identical for every generation — cache it. ~80%
      // of input tokens come from this block, so cache hits cut cost sharply.
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: userContent }],
    // SDK helper's .d.ts is typed for Zod v3's ZodType but it `require()`s
    // `zod/v4` at runtime — cast around the type mismatch.
    output_config: { format: zodOutputFormat(modelOutputSchema as any) },
  });

  if (!response.parsed_output) {
    throw new Error(`Story generation returned no parsed output (stop_reason=${response.stop_reason})`);
  }
  const parsed: ModelOutput = response.parsed_output;

  const document: StoryDocument = {
    storyId:  '', // filled in by caller after DB upsert
    childId:  '', // ditto
    monthKey: input.monthKey,
    locale:   input.locale,
    meta: {
      title:          parsed.title,
      coverImageUrl:  input.candidateCoverImageUrl ?? '',
      childAgeMonths: input.childAgeMonths,
    },
    theme: {
      themeId:    'default',
      assignedAt: input.generatedAt,
      version:    1,
    },
    watermark: {
      enabled: input.watermarkEnabled,
      text:    'Made with Nestory',
    },
    shareMeta: {
      ogTitle:       parsed.title,
      ogDescription: parsed.ogDescription,
      ogImageUrl:    input.candidateCoverImageUrl ?? '',
    },
    qualityLevel: parsed.qualityLevel,
    sections:     parsed.sections.map((s, i) => ({
      id:           `sec_${i}`,
      intent:       s.intent,
      outputType:   s.outputType,
      ...(s.text !== undefined ? { text: s.text } : {}),
    })),
  };

  const meta: GenerationMeta = {
    promptVersion:        PROMPT_VERSION,
    modelName:            MODEL,
    qualityLevel:         parsed.qualityLevel,
    qualityScore:         qualityScoreFor(parsed.qualityLevel, input.memories.length),
    generatedAt:          input.generatedAt,
    generationDurationMs: Date.now() - start,
    failureTracking: {
      retries:      0,
      usedFallback: false,
    },
  };

  return { document, meta };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

type UserContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'url'; url: string } };

function buildUserContent(input: GenerateStoryInput): UserContentBlock[] {
  // Pick up to MAX_IMAGES photos: one per memory in chronological order, then
  // a second pass for memories that have multiple photos. This keeps temporal
  // coverage broad before getting deep on photo-heavy moments.
  const selected: { memoryIndex: number; fileUrl: string }[] = [];
  for (const [i, m] of input.memories.entries()) {
    if (m.fileUrls[0]) selected.push({ memoryIndex: i, fileUrl: m.fileUrls[0] });
    if (selected.length >= MAX_IMAGES) break;
  }
  if (selected.length < MAX_IMAGES) {
    for (const [i, m] of input.memories.entries()) {
      for (let j = 1; j < m.fileUrls.length; j++) {
        selected.push({ memoryIndex: i, fileUrl: m.fileUrls[j]! });
        if (selected.length >= MAX_IMAGES) break;
      }
      if (selected.length >= MAX_IMAGES) break;
    }
  }
  const photoIndexByMemory = new Map<number, number[]>();
  selected.forEach((s, idx) => {
    const list = photoIndexByMemory.get(s.memoryIndex) ?? [];
    list.push(idx + 1); // 1-based for human-readable refs in the text
    photoIndexByMemory.set(s.memoryIndex, list);
  });

  const lines: string[] = [];
  lines.push(`Child: ${input.childName} (${formatAge(input.childAgeMonths)})`);
  lines.push(`Month: ${input.monthLabel}`);
  lines.push(`Locale: ${input.locale}`);
  lines.push('');
  lines.push(`Memories captured this month (${input.memories.length}):`);
  if (input.memories.length === 0) {
    lines.push('  (none — write a brief, honest "low" quality story.)');
  } else {
    for (const [i, m] of input.memories.entries()) {
      const dateLabel = new Date(m.capturedAt).toLocaleDateString(input.locale, {
        month: 'short', day: 'numeric',
      });
      const tagPart   = m.tags.length > 0 ? `  [${m.tags.join(', ')}]` : '';
      const photoIdxs = photoIndexByMemory.get(i);
      const photoPart = photoIdxs && photoIdxs.length > 0
        ? `  (photos #${photoIdxs.join(', #')}${m.fileUrls.length > photoIdxs.length ? ` of ${m.fileUrls.length}` : ''})`
        : m.fileUrls.length > 0 ? `  (${m.fileUrls.length} photo${m.fileUrls.length === 1 ? '' : 's'}, not attached)` : '';
      const note      = (m.textNote?.trim()) || '(no caption)';
      lines.push(`- ${dateLabel}${photoPart}${tagPart}: ${note}`);
    }
  }
  lines.push('');
  if (selected.length > 0) {
    lines.push(`${selected.length} photo${selected.length === 1 ? '' : 's'} attached below in the order referenced above.`);
    lines.push('');
  }
  lines.push("Write the month's story now. Output JSON conforming to the schema.");

  const blocks: UserContentBlock[] = [{ type: 'text', text: lines.join('\n') }];
  for (const s of selected) {
    blocks.push({ type: 'image', source: { type: 'url', url: s.fileUrl } });
  }
  return blocks;
}

function formatAge(months: number): string {
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (m === 0) return `${y} year${y === 1 ? '' : 's'}`;
  return `${y} year${y === 1 ? '' : 's'} ${m} month${m === 1 ? '' : 's'}`;
}

function qualityScoreFor(level: 'low' | 'medium' | 'rich', memoryCount: number): number {
  // Coarse heuristic until we wire a real scorer. Keep within [0, 1].
  const base = level === 'rich' ? 0.85 : level === 'medium' ? 0.65 : 0.4;
  const mem  = Math.min(memoryCount / 20, 1) * 0.1;
  return Number((base + mem).toFixed(3));
}

// ─── Mock implementation ───────────────────────────────────────────────────
// Deterministic StoryDocument produced from input — same input always returns
// the same story. Lets the queue/worker/mobile-render path be debugged in
// isolation from prompt-quality concerns. Toggle with STORY_AI_MOCK=1.

function mockGenerateStory(input: GenerateStoryInput): GenerateStoryResult {
  const memCount = input.memories.length;
  const qualityLevel: 'low' | 'medium' | 'rich' =
    memCount >= 8 ? 'rich' : memCount >= 3 ? 'medium' : 'low';

  const title = `${input.monthLabel} with ${input.childName}`;
  const captions = input.memories
    .map(m => m.textNote?.trim())
    .filter((t): t is string => !!t && t.length > 0);

  const sections: StoryDocument['sections'] = [
    {
      id:         'sec_0',
      intent:     'summary',
      outputType: 'text',
      text: memCount === 0
        ? `${input.monthLabel} was a quiet month for ${input.childName}.`
        : `${input.monthLabel} brought ${memCount} moment${memCount === 1 ? '' : 's'} worth holding onto with ${input.childName}.`,
    },
    {
      id:         'sec_1',
      intent:     'narrative',
      outputType: 'text',
      text: captions.length > 0
        ? captions.slice(0, 3).map(c => `— ${c}`).join('\n\n')
        : `(Mock narrative — ${input.childName} grew, played, and rested. Real story generation runs when STORY_AI_MOCK is off.)`,
    },
    {
      id:         'sec_2',
      intent:     'closing',
      outputType: 'text',
      text: 'A small chapter, kept.',
    },
  ];

  const document: StoryDocument = {
    storyId:  '',
    childId:  '',
    monthKey: input.monthKey,
    locale:   input.locale,
    meta: {
      title,
      coverImageUrl:  input.candidateCoverImageUrl ?? '',
      childAgeMonths: input.childAgeMonths,
    },
    theme: {
      themeId:    'default',
      assignedAt: input.generatedAt,
      version:    1,
    },
    watermark: {
      enabled: input.watermarkEnabled,
      text:    'Made with Nestory',
    },
    shareMeta: {
      ogTitle:       title,
      ogDescription: `${input.childName}'s ${input.monthLabel}, in ${memCount} moment${memCount === 1 ? '' : 's'}.`,
      ogImageUrl:    input.candidateCoverImageUrl ?? '',
    },
    qualityLevel,
    sections,
  };

  const meta: GenerationMeta = {
    promptVersion:        `${PROMPT_VERSION}+mock`,
    modelName:            'mock',
    qualityLevel,
    qualityScore:         qualityScoreFor(qualityLevel, memCount),
    generatedAt:          input.generatedAt,
    generationDurationMs: 0,
    failureTracking: {
      retries:      0,
      usedFallback: false,
    },
  };

  return { document, meta };
}
