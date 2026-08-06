import type {
  BlockLayout,
  StoryBlock,
  StoryBodyChapter,
  StoryClosingSection,
  StoryCoverSection,
  StoryOpeningSection,
} from '@nestory/types';
import { type StoryGenConfig } from './config';
import type { StructureDecision } from './prompt1';
import type { WritingOutput } from './prompt2';
import type { LaidOutChapter, LayoutDecision, PhotoMeta } from './imageLayer';
import { pickCover } from './imageLayer';

// 组装 (StoryGenPrompts §5) + 质量校验 (StoryH5Design §3.5).
// 三份产物按 theme_key / unit_id 对齐;Single-V 的 v1/v2 在这里按字数回填。

// Closing headline 是产品向固定文案(代码常量,不消耗 LLM)。
const CLOSING_HEADLINE = "Nestory keeps your little one's everyday moments as they grow.";

// Block-Single-V: short text → v1 (图文顶对齐), long text → v2 (文字绕图)。
// 阈值按 §4.1 段落 30-50 词取中值;上线后可按视觉实测调。
const SINGLE_V_SHORT_MAX_WORDS = 38;

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function resolveLayout(layout: LayoutDecision, text: string): BlockLayout {
  if (layout !== 'Block-Single-V') return layout;
  return wordCount(text) <= SINGLE_V_SHORT_MAX_WORDS ? 'Block-Single-V-v1' : 'Block-Single-V-v2';
}

export interface AssembleInput {
  childName:    string;
  monthDisplay: string;        // "NOVEMBER 2025"
  structure:    StructureDecision;
  laidOut:      LaidOutChapter[];
  writing:      WritingOutput;
  /** All of the month's photos (surviving moments) — Cover-A/B 判定用. */
  allPhotos:    PhotoMeta[];
  /** Month totals for the Closing stats (包含未入选素材, 决策 C1). */
  totals:       { moments: number; photos: number };
}

export interface AssembledCore {
  cover:   StoryCoverSection;
  opening: StoryOpeningSection;
  body:    StoryBodyChapter[];
  closing: StoryClosingSection;
}

export function assemble(input: AssembleInput, cfg: StoryGenConfig): AssembledCore {
  const { structure, laidOut, writing } = input;

  const writingByTheme = new Map(writing.chapters.map(c => [c.theme_key, c]));
  const laidOutByTheme = new Map(laidOut.map(c => [c.themeKey, c]));

  const body: StoryBodyChapter[] = structure.chapter_order.map(themeKey => {
    const w = writingByTheme.get(themeKey);
    const l = laidOutByTheme.get(themeKey);
    const structCh = structure.chapters.find(c => c.theme_key === themeKey);
    if (!w || !l || !structCh) {
      throw new AssembleValidationError([`chapter ${themeKey} missing from one of the three artifacts`]);
    }
    const textByUnit = new Map(w.units.map(u => [u.unit_id, u.text]));
    const blocks: StoryBlock[] = structCh.units.map(unit => {
      const laidBlock = l.blocks[structCh.units.indexOf(unit)];
      const text = textByUnit.get(unit.unit_id) ?? '';
      return {
        momentIds:   unit.moment_ids,
        text,
        photos:      laidBlock?.photos ?? [],
        blockLayout: resolveLayout(laidBlock?.layout ?? 'Block-Text', text),
      };
    });
    return {
      type:            'body',
      chapterTitle:    w.title,
      narrativeThread: w.narrative_thread,
      blocks,
    };
  });

  const coverPick = pickCover(input.allPhotos, cfg);
  const cover: StoryCoverSection = {
    type:          'cover',
    layout:        coverPick.layout,
    month:         input.monthDisplay,
    childName:     input.childName,
    subtitle:      writing.cover_subtitle,
    coverPhotoUrl: coverPick.coverPhotoUrl,
  };

  const opening: StoryOpeningSection = {
    type:       'opening',
    paragraphs: writing.opening.paragraphs,
  };

  const closing: StoryClosingSection = {
    type:     'closing',
    headline: CLOSING_HEADLINE,
    stats:    input.totals,
  };

  const core: AssembledCore = { cover, opening, body, closing };
  const issues = validate(core, input, cfg);
  if (issues.length > 0) throw new AssembleValidationError(issues);
  return core;
}

export class AssembleValidationError extends Error {
  constructor(public issues: string[]) {
    super(`Story assembly failed validation: ${issues.join('; ')}`);
  }
}

/** §3.5 质量校验清单(结构完整/章节数/长度/无悬空章)— 失败由调用方重试。 */
function validate(core: AssembledCore, input: AssembleInput, cfg: StoryGenConfig): string[] {
  const issues: string[] = [];
  const { min: pMin, max: pMax } = cfg.text.unitParagraphWords;

  if (core.body.length < 1 || core.body.length > cfg.bodyChapterHardCap) {
    issues.push(`chapter count ${core.body.length} outside 1..${cfg.bodyChapterHardCap}`);
  }
  for (const ch of core.body) {
    if (!ch.chapterTitle.trim()) issues.push('empty chapter title');
    if (wordCount(ch.chapterTitle) > cfg.text.chapterTitleMaxWords + 2) {
      issues.push(`chapter title too long: "${ch.chapterTitle}"`);
    }
    if (ch.blocks.length === 0) issues.push(`chapter "${ch.chapterTitle}" has no blocks`);
    for (const b of ch.blocks) {
      if (b.momentIds.length === 0) issues.push('dangling block without moment ids');
      const wc = wordCount(b.text);
      // 长度用宽松带(±40%)校验 — 模型对词数只能近似遵循,过严会重试风暴
      if (b.text && (wc < Math.floor(pMin * 0.6) || wc > Math.ceil(pMax * 1.4))) {
        issues.push(`block paragraph ${wc} words outside soft band`);
      }
    }
  }
  if (core.opening.paragraphs.length < cfg.text.openingParagraphs.min ||
      core.opening.paragraphs.length > cfg.text.openingParagraphs.max) {
    issues.push('opening paragraph count out of range');
  }
  if (wordCount(core.cover.subtitle) > cfg.text.coverSubtitleMaxWords + 2) {
    issues.push(`cover subtitle too long: "${core.cover.subtitle}"`);
  }
  if (!core.cover.childName.trim()) issues.push('cover missing child name');
  return issues;
}
