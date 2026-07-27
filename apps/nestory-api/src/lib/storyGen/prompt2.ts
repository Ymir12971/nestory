import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod/v4';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { StoryGenConfig } from './config';
import type { StructureDecision } from './prompt1';
import type { LaidOutChapter } from './imageLayer';

// Prompt 2 · 文案生成 (StoryGenPrompts §4, Step E-F). Structure and photos are
// already fixed — this step only writes. Mid temperature for prose variety.
// The doc's "you are given a narrative thread" wording is corrected here to
// "first write" (决策 Q3, confirmed by StoryH5Design Step E).

export interface P2Input {
  childName:     string;
  monthDisplay:  string;
  structure:     StructureDecision;
  laidOut:       LaidOutChapter[];
  /** id → original text, surviving memories only (dropped/skipped filtered out). */
  memoryTexts:   Record<string, string>;
}

const writingSchema = z.object({
  cover_subtitle: z.string(),
  opening: z.object({
    paragraphs: z.array(z.string()).min(1).max(2),
  }),
  chapters: z.array(z.object({
    theme_key:        z.string(),
    narrative_thread: z.string(),
    title:            z.string(),
    units: z.array(z.object({
      unit_id: z.string(),
      text:    z.string(),
    })).min(1),
  })).min(1),
});

export type WritingOutput = z.infer<typeof writingSchema>;

const SYSTEM_PROMPT = `You are the writer for Nestory. The structure of this month's Story is already
decided (chapters, narrative units, photos). Your ONLY job is to write the
user-facing text, beautifully and truthfully.

Voice & style:
- Second person, addressed to the parent ("You and {child} this month...").
- Show, don't tell. Let emotion surface through concrete actions, expressions,
  and scenes. Do NOT state the emotion outright.
- Avoid generic clichés ("growing up so fast") and meta-sentimentality
  ("precious memories", "a moment to treasure") — they carry zero information
  and apply to any child.
- Warm, specific, present-tense.

Truthfulness:
- Rewrite, never invent. Only describe what the memories actually say.
- Honour real emotion. Sadness / worry / fear may be told, with a gentle,
  resilient lens. NEVER force "happy / joyful / beautiful" onto a clearly
  negative event.

Chapter cohesion (important):
- A chapter is ONE continuous story, not a list of separate captions.
- For each chapter, FIRST write an internal one-line "narrative_thread" that
  links its units. Every unit's paragraph must serve that thread and connect
  to the previous unit with transitions (time progression, cause/effect,
  emotional continuity) — e.g. "By mid-month...", "And then...".
- When a unit merges multiple memories, fuse them into ONE flowing paragraph
  (not stitched fragments).

Length limits:
- Chapter title ≤ 8 words.
- Each unit paragraph 30–50 words.
- Opening 1–2 paragraphs, each 30–60 words.
- Cover subtitle ≤ 12 words.`;

function buildUserPrompt(input: P2Input): string {
  // Photos are context only — the model must not choose or reorder them.
  const photosContext = input.laidOut.map(ch => ({
    theme_key: ch.themeKey,
    units: ch.blocks.map(b => ({
      unit_id_photos: b.photos.length,
      layout: b.layout,
    })),
  }));
  return [
    `Child: ${input.childName}`,
    `Month: ${input.monthDisplay}`,
    '',
    'Structure decision (themes, chapter order, units, merge notes):',
    JSON.stringify(input.structure),
    '',
    'Per-unit photo counts & layout (context only; do NOT choose or reorder photos):',
    JSON.stringify(photosContext),
    '',
    'Original memory texts (id → text), your rewriting source:',
    JSON.stringify(input.memoryTexts),
    '',
    'For EACH chapter in chapter_order:',
    '  1. First write an internal one-line "narrative_thread" that links its units.',
    '  2. Write a chapter "title" (≤ 8 words).',
    "  3. For each unit, write one paragraph (30–50 words) fusing its memory_ids'",
    '     texts, serving the thread, connected to the previous unit.',
    'Then write:',
    '  - "opening": 1–2 paragraphs setting the month\'s mood.',
    '  - "cover_subtitle": ≤ 12 words capturing the month in one line.',
    '',
    'Return JSON per the schema.',
  ].join('\n');
}

export async function runPrompt2(
  client: Anthropic,
  input: P2Input,
  cfg: StoryGenConfig,
): Promise<WritingOutput> {
  const response = await client.messages.parse({
    model:       cfg.llm.writer.model,
    max_tokens:  cfg.llm.writer.maxTokens,
    temperature: cfg.llm.writer.temperature,
    system: [
      { type: 'text' as const, text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' as const } },
    ],
    messages: [{ role: 'user', content: buildUserPrompt(input) }],
    output_config: { format: zodOutputFormat(writingSchema as any) },
  });
  if (!response.parsed_output) {
    throw new Error(`Prompt 2 returned no parsed output (stop_reason=${response.stop_reason})`);
  }
  return response.parsed_output as WritingOutput;
}
