import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod/v4';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { type StoryGenConfig, maxThemesForMomentCount } from './config';

// Prompt 1 · 结构决策 (StoryGenPrompts §2, Step A-D). STRUCTURE ONLY — no
// user-facing text. Low temperature: the structure should be reproducible.
//
// Deviation from the doc: highlight/is_highlight and tag signals are dropped —
// Highlights went in the 2026-07 redesign and Tags followed (Justin 2026-08-09),
// so moments carry only text and photo counts as signals.

export interface P1Moment {
  id:         string;
  capturedAt: string;        // ISO 8601
  text:       string;        // moments are text-required since the redesign
  photoCount: number;
}

export interface P1Input {
  childName:     string;
  childAgeMonths: number;
  monthDisplay:  string;     // "NOVEMBER 2025"
  monthKey:      string;
  moments:      P1Moment[];
}

const structureSchema = z.object({
  generate: z.boolean(),
  reason:   z.string().nullable(),
  chapter_order: z.array(z.string()),
  chapters: z.array(z.object({
    theme_key:   z.string(),
    theme_label: z.string(),
    units: z.array(z.object({
      unit_id:      z.string(),
      moment_ids:   z.array(z.string()).min(1),
      merge_reason: z.string().nullable(),
    })).min(1),
  })),
  dropped_moment_ids: z.array(z.string()),
  skipped_moment_ids: z.array(z.string()),
});

export type StructureDecision = z.infer<typeof structureSchema>;

const SYSTEM_PROMPT = `You are the narrative architect for Nestory, a baby-moment app that turns a
parent's monthly notes and photos into a short, beautifully told "Story" about
their child.

Your job in THIS step is STRUCTURE ONLY. You do NOT write the final story text.
You read all of this month's moments and decide:
  A. Theme Discovery — what recurring themes run through this month.
  B. Theme Selection — pick the themes that genuinely define the month, within
     the cap you are given. The number of selected themes = the number of Body
     chapters.
  C. Moment Allocation & Clustering —
     C1. Assign each moment to exactly ONE theme (chapter).
     C2. Within each chapter, find moments about the SAME or HIGHLY SIMILAR
         events and either:
         - MERGE them into one "narrative unit" if each adds new information or
           shows progression (e.g. "took 3 steps" + "walked 4 steps" = progress).
         - DEDUPE if they are near-duplicates with no new information: keep only
           the single best moment (more specific text / more photos), drop the
           rest entirely.
     One narrative unit = one Block in the final layout. A unit may contain one
     or more moments.
  D. Narrative Ordering — order the chapters for emotional rhythm
     (e.g. light→meaningful, inner→outer, build a gentle arc).

Hard rules:
- Theme count must respect the cap provided to you.
- Every selected moment belongs to exactly one chapter and one unit.
- Dropped (deduped) moments must be listed explicitly so downstream steps skip them.
- Skip any moment that is clearly NOT about the child (list it in
  skipped_moment_ids); if fewer than 5 usable moments remain, return
  generate=false with a reason.
- You do NOT choose photos — downstream code does. Use photo COUNT only as a
  hint of how rich a moment is.`;

function buildUserPrompt(input: P1Input, cfg: StoryGenConfig): string {
  const cap = maxThemesForMomentCount(input.moments.length, cfg);
  const moments = input.moments.map(m => ({
    id:          m.id,
    captured_at: m.capturedAt,
    text:        m.text,
    photo_count: m.photoCount,
  }));
  return [
    `Child profile: ${input.childName}, ${input.childAgeMonths} months old`,
    `Month: ${input.monthDisplay} (${input.monthKey})`,
    `Total moments this month: ${input.moments.length}`,
    `Theme-count cap for this volume: max ${cap} themes (fewer is fine if the month genuinely has fewer).`,
    '',
    'Here are all moments for this month (JSON array):',
    JSON.stringify(moments),
    '',
    'Return the structure decision as JSON following the schema.',
  ].join('\n');
}

export async function runPrompt1(
  client: Anthropic,
  input: P1Input,
  cfg: StoryGenConfig,
): Promise<StructureDecision> {
  const response = await client.messages.parse({
    model:       cfg.llm.structure.model,
    max_tokens:  cfg.llm.structure.maxTokens,
    temperature: cfg.llm.structure.temperature,
    system: [
      { type: 'text' as const, text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' as const } },
    ],
    messages: [{ role: 'user', content: buildUserPrompt(input, cfg) }],
    output_config: { format: zodOutputFormat(structureSchema as any) },
  });
  if (!response.parsed_output) {
    throw new Error(`Prompt 1 returned no parsed output (stop_reason=${response.stop_reason})`);
  }
  return response.parsed_output as StructureDecision;
}
