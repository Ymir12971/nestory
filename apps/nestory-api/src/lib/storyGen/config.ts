/**
 * Story-generation configuration — the single place for every value that the
 * spec leaves tunable, that Vicol hasn't finalized, or that we expect to adjust
 * against real data after launch.
 *
 * Design intent: the two spec docs (StoryH5Design v1.2, StoryGenPrompts v1.0)
 * describe a 2-LLM-call + deterministic-image-layer pipeline whose numbers are
 * explicitly "tune against samples once live" (§3.2) and whose layout edge-cases
 * Vicol has NOT yet decided. Rather than block on those answers, every such
 * value is a knob here with a sensible default. When Vicol answers (or we learn
 * from data), it's a one-line change in this file — not a code rewrite.
 *
 * What is NOT config: the pipeline SHAPE (Prompt1 → image layer → Prompt2 →
 * assembly). That's structural and stable; making it configurable would be the
 * premature abstraction we're avoiding. Config covers values and policy picks,
 * not architecture.
 *
 * Anything marked ⚠️ VICOL-PENDING is an open question from the spec review;
 * the default is our best inference, safe to run, and flagged so we know exactly
 * what to revisit when the answer lands.
 */

// ─── Pipeline selection ──────────────────────────────────────────────────────

/**
 * Which generator runs. `single-shot-v2` is the current shipped implementation
 * (one LLM call → flat sections, see storyAi.ts). `two-phase-v3` is the new
 * spec pipeline. Kept side-by-side so v3 can be rolled out and rolled back via
 * this flag alone — the working v2 is never ripped out.
 *
 * Env override: STORY_PIPELINE=two-phase-v3
 */
export type PipelineMode = 'single-shot-v2' | 'two-phase-v3';

// ─── Layout policy picks (⚠️ VICOL-PENDING) ─────────────────────────────────

/**
 * Block-Grid with THREE vertical (3:4) photos. §3.6.3 requires the Hero to be
 * non-3:4 AND says Duo/Grid "preserve each photo's orientation" — mutually
 * exclusive when all three are portrait. This is a COMMON case (parents shoot
 * portrait), not an edge case. Vicol Q#1.
 *   - crop-hero-to-4x3      : crop the best photo to 4:3 for the Hero, keep the
 *                             other two portrait in the Duo slot. (default —
 *                             keeps the Grid, accepts one orientation change)
 *   - demote-to-single-v    : drop to Block-Single-V using only the best photo
 *                             (loses 2 photos; most faithful to "no forced crop")
 *   - demote-to-duo         : keep best two portraits as a side-by-side Duo,
 *                             drop the third
 */
export type GridAllVerticalPolicy = 'crop-hero-to-4x3' | 'demote-to-single-v' | 'demote-to-duo';

/**
 * Chapter photo-cap round-2 reduction. §3.6.1 rule 3 is self-contradictory:
 * "strip whole worst units' photos" vs "always keep ≥1 photo per unit". Vicol Q#2.
 *   - demote-worst-units-to-text : worst units lose all photos → Block-Text,
 *                                  until ≤ cap. (default — matches E03 existing
 *                                  Block-Text state; "≥1 per unit" is a soft
 *                                  preference satisfied by round-1 only)
 *   - keep-one-per-unit          : never drop a unit's last photo; allow the
 *                                  chapter to exceed the cap instead
 */
export type ChapterTrimPolicy = 'demote-worst-units-to-text' | 'keep-one-per-unit';

// ─── Config shape ────────────────────────────────────────────────────────────

export interface StoryGenConfig {
  pipeline: PipelineMode;

  /** E01 — below this many usable memories, don't generate at all. */
  minMemoriesToGenerate: number;

  /**
   * Theme-count cap by memory volume (StoryH5Design §4.2 / PromptGen §2.2).
   * Sorted ascending by `upToMemories` (inclusive upper bound); the first
   * bracket a count falls into gives the max theme (= Body chapter) count.
   */
  themeCountCaps: ReadonlyArray<{ upToMemories: number; maxThemes: number }>;
  /** Body chapters never exceed this regardless of themes chosen (§4.2). */
  bodyChapterHardCap: number;

  image: {
    /** Gold-tier gate (§3.2). All objective, computed in preprocessing. */
    gold: {
      shortEdgeMinPx: number;
      /** OpenCV Laplacian variance; higher = sharper. Doc default 100, "tune on samples". */
      laplacianVarianceMin: number;
    };
    /** Per narrative-unit photo cap (§3.6.1 rule 2). */
    photosPerUnitCap: number;
    /** Per chapter photo cap (§3.6.1 rule 3). */
    photosPerChapterCap: number;
    gridAllVerticalPolicy: GridAllVerticalPolicy;
    chapterTrimPolicy: ChapterTrimPolicy;
  };

  /** Text length limits (§3.3 / §4.3). Enforced in prompts + validated post-gen. */
  text: {
    chapterTitleMaxWords: number;
    unitParagraphWords: { min: number; max: number };
    openingParagraphs: { min: number; max: number };
    openingParagraphWords: { min: number; max: number };
    coverSubtitleMaxWords: number;
  };

  llm: {
    /** Prompt 1 — structure decision. Low temp for stable, reproducible structure (§6). */
    structure: { model: string; temperature: number; maxTokens: number };
    /** Prompt 2 — writing. Mid temp for prose variety (§6). */
    writer: { model: string; temperature: number; maxTokens: number };
    /** Auto-retry on invalid JSON / validation failure (§3.5, §6). */
    maxRetries: number;
    retryDelayMs: number;
  };
}

// ─── Defaults (straight from the specs) ──────────────────────────────────────

const DEFAULT_MODEL = 'claude-sonnet-4-6';

const defaults: StoryGenConfig = {
  pipeline: 'single-shot-v2',

  minMemoriesToGenerate: 5,

  themeCountCaps: [
    { upToMemories: 10,       maxThemes: 2 },
    { upToMemories: 25,       maxThemes: 3 },
    { upToMemories: 50,       maxThemes: 4 },
    { upToMemories: Infinity, maxThemes: 5 },
  ],
  bodyChapterHardCap: 5,

  image: {
    gold: {
      shortEdgeMinPx:       800,
      laplacianVarianceMin: 100,
    },
    photosPerUnitCap:    3,
    photosPerChapterCap: 20,
    // ⚠️ Vicol 2026-07-12: says this case "won't occur" (handled in Claude Design);
    // detail coming that evening. Knob kept as a safety net until confirmed —
    // "won't happen" is cheap to guard against and expensive to be wrong about.
    gridAllVerticalPolicy: 'crop-hero-to-4x3',
    // ⚠️ Vicol 2026-07-12: question not yet understood; clarifying that evening.
    // Only fires when one chapter has >20 units (rare); default is safe meanwhile.
    chapterTrimPolicy:     'demote-worst-units-to-text',
  },

  text: {
    chapterTitleMaxWords:  8,
    unitParagraphWords:    { min: 30, max: 50 },
    openingParagraphs:     { min: 1,  max: 2 },
    openingParagraphWords: { min: 30, max: 60 },
    coverSubtitleMaxWords: 12,
  },

  llm: {
    structure: { model: DEFAULT_MODEL, temperature: 0.4,  maxTokens: 4000 },
    writer:    { model: DEFAULT_MODEL, temperature: 0.75, maxTokens: 8000 },
    maxRetries:   2,
    retryDelayMs: 30_000,
  },
};

// ─── Resolution (defaults + a few env operational overrides) ─────────────────

function envPipeline(): PipelineMode | null {
  const v = (process.env.STORY_PIPELINE ?? '').trim();
  return v === 'single-shot-v2' || v === 'two-phase-v3' ? v : null;
}

/**
 * The resolved, read-only config. Code defaults are the source of truth; only
 * operational toggles read from env (matching how storyAi.ts reads STORY_AI_MOCK
 * directly). Deeper per-value env plumbing is deliberately deferred until a real
 * need shows up — the code defaults are the intended knobs for now.
 */
export function getStoryGenConfig(): StoryGenConfig {
  return {
    ...defaults,
    pipeline: envPipeline() ?? defaults.pipeline,
  };
}

/** Resolve the theme cap for a given usable-memory count. */
export function maxThemesForMemoryCount(count: number, cfg: StoryGenConfig = getStoryGenConfig()): number {
  for (const bracket of cfg.themeCountCaps) {
    if (count <= bracket.upToMemories) return bracket.maxThemes;
  }
  return cfg.themeCountCaps[cfg.themeCountCaps.length - 1]?.maxThemes ?? 5;
}
