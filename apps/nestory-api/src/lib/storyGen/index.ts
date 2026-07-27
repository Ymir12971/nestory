import Anthropic from '@anthropic-ai/sdk';
import type { GenerationMeta, StoryDocumentV3 } from '@nestory/types';
import { type StoryGenConfig, getStoryGenConfig } from './config';
import { runPrompt1, type P1Memory, type StructureDecision } from './prompt1';
import { runPrompt2 } from './prompt2';
import { layoutChapters, type PhotoMeta } from './imageLayer';
import { assemble, AssembleValidationError } from './assemble';

// storyGen v3 — 两段 LLM + 中间确定性图片层 (StoryGenPrompts v1.0 全流水线).
// 由 storyQueue 按 config.pipeline === 'two-phase-v3' 调度;v2 (storyAi.ts)
// 保持原样作为回退。

export interface V3Photo extends PhotoMeta {}

export interface V3Memory {
  id:         string;
  capturedAt: string;
  text:       string;
  tags:       string[];
  photos:     V3Photo[];
}

export interface GenerateStoryV3Input {
  childName:        string;
  childAgeMonths:   number;
  monthKey:         string;   // "YYYY-MM"
  monthDisplay:     string;   // "NOVEMBER 2025"
  locale:           string;
  memories:         V3Memory[];
  watermarkEnabled: boolean;
  generatedAt:      string;   // ISO 8601
}

export type GenerateStoryV3Result =
  | { ok: true; document: StoryDocumentV3; meta: GenerationMeta }
  | { ok: false; reason: 'E01_INSUFFICIENT_MEMORIES' | 'P1_DECLINED'; detail: string | null };

const PROMPT_VERSION = 'storyGen:v3-two-phase';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export async function generateStoryV3(
  input: GenerateStoryV3Input,
  cfg: StoryGenConfig = getStoryGenConfig(),
): Promise<GenerateStoryV3Result> {
  const start = Date.now();

  // E01 前置拦截:素材不足不调 LLM
  if (input.memories.length < cfg.minMemoriesToGenerate) {
    return {
      ok: false,
      reason: 'E01_INSUFFICIENT_MEMORIES',
      detail: `${input.memories.length} memories < ${cfg.minMemoriesToGenerate}`,
    };
  }

  const client = getClient();

  // ── Prompt 1 · 结构决策 ──────────────────────────────────────────────
  const p1Memories: P1Memory[] = input.memories.map(m => ({
    id:         m.id,
    capturedAt: m.capturedAt,
    text:       m.text,
    tags:       m.tags,
    photoCount: m.photos.length,
  }));
  const structure: StructureDecision = await runPrompt1(client, {
    childName:      input.childName,
    childAgeMonths: input.childAgeMonths,
    monthDisplay:   input.monthDisplay,
    monthKey:       input.monthKey,
    memories:       p1Memories,
  }, cfg);

  if (!structure.generate) {
    return { ok: false, reason: 'P1_DECLINED', detail: structure.reason };
  }

  // ── 代码层 · 图片处理(确定性,不调 LLM)─────────────────────────────
  const excluded = new Set([...structure.dropped_memory_ids, ...structure.skipped_memory_ids]);
  const photosByMemory = new Map(input.memories.map(m => [m.id, m.photos]));
  const lookup = (memoryId: string) =>
    excluded.has(memoryId) ? [] : (photosByMemory.get(memoryId) ?? []);
  const laidOut = layoutChapters(
    structure.chapters.map(c => ({
      themeKey: c.theme_key,
      units:    c.units.map(u => ({ memoryIds: u.memory_ids })),
    })),
    lookup,
    cfg,
  );

  // ── Prompt 2 · 文案(校验失败重试一次,§3.5)────────────────────────
  const memoryTexts: Record<string, string> = {};
  for (const m of input.memories) {
    if (!excluded.has(m.id)) memoryTexts[m.id] = m.text;
  }
  const surviving = input.memories.filter(m => !excluded.has(m.id));
  const allPhotos = surviving.flatMap(m => m.photos);
  const totals = {
    memories: input.memories.length,
    photos:   input.memories.reduce((n, m) => n + m.photos.length, 0),
  };

  let retries = 0;
  let core;
  for (;;) {
    const writing = await runPrompt2(client, {
      childName:    input.childName,
      monthDisplay: input.monthDisplay,
      structure,
      laidOut,
      memoryTexts,
    }, cfg);
    try {
      core = assemble({
        childName:    input.childName,
        monthDisplay: input.monthDisplay,
        structure,
        laidOut,
        writing,
        allPhotos,
        totals,
      }, cfg);
      break;
    } catch (err) {
      if (err instanceof AssembleValidationError && retries < 1) {
        retries += 1;
        continue; // 写作重试一次;结构与图片保持不变
      }
      throw err;
    }
  }

  const document: StoryDocumentV3 = {
    renderVersion: 3,
    storyId:  '', // caller fills after DB upsert
    childId:  '', // ditto
    monthKey: input.monthKey,
    locale:   input.locale,
    meta: {
      title:          `${input.childName} · ${input.monthDisplay}`,
      childAgeMonths: input.childAgeMonths,
    },
    theme:     { themeId: 'default', assignedAt: input.generatedAt, version: 1 },
    watermark: { enabled: input.watermarkEnabled, text: 'Made with Nestory' },
    shareMeta: {
      ogTitle:       `${input.childName}'s ${input.monthDisplay} Story`,
      ogDescription: core.cover.subtitle,
      ogImageUrl:    core.cover.coverPhotoUrl ?? '',
    },
    qualityLevel: input.memories.length >= 15 ? 'rich' : input.memories.length >= 8 ? 'medium' : 'low',
    ...core,
  };

  const meta: GenerationMeta = {
    promptVersion:        PROMPT_VERSION,
    modelName:            cfg.llm.writer.model,
    qualityLevel:         document.qualityLevel,
    qualityScore:         Math.min(1, input.memories.length / 20),
    generatedAt:          input.generatedAt,
    generationDurationMs: Date.now() - start,
    failureTracking:      { retries, usedFallback: false },
  };

  return { ok: true, document, meta };
}
