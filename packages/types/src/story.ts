// Story — aligns with GET /stories, GET /stories/:id, GET /stories/:id/status

export type StoryStatus =
  | 'pending'
  | 'queued'
  | 'generating'
  | 'pending_review'   // §8.2 human review gate (STORY_REVIEW_REQUIRED); user sees "generating"
  | 'generated'
  | 'failed'
  | 'fallback_generated';

// Returned by backend in list and detail; frontend renders directly without deriving
// current month states come from current_month.list_item_state
// historical states come from data[].list_item_state
export type StoryListItemState =
  | 'current_collecting'       // current month, moments accumulating
  | 'current_in_progress'      // current month, generation triggered/running
  | 'current_quota_exhausted'  // current month, Free quota used up (R-01)
  | 'current_generated'        // current month, story finished (manual trigger / early generation)
  | 'historical_generated'     // past month, story completed (watermark per watermarkEnabled)
  | 'historical_not_generated'; // past month, no story exists

// GET /stories — list item (historical rows + null-padded months)
export interface StoryListItem {
  id: string | null;                    // null for months with no story
  monthKey: string;                     // "YYYY-MM"
  status: StoryStatus | null;
  listItemState: StoryListItemState;
  coverImageUrl: string | null;
  title: string | null;                 // e.g. "March · 8 months"
  isLastFreeStory: boolean;             // Paywall A trigger — check on return from S-02
  watermarkEnabled: boolean | null;     // null when no story
  generatedAt: string | null;
  momentCount: number | null;           // null when no story; count of moments used to generate
  /**
   * Redesign (S-Regeneration allowed): moments changed after this month's
   * story was generated (or after a no-moments month got backfilled).
   * Premium-only regenerate strip renders when true. Backend populates this
   * once moment-change tracking lands (WorkPlan §6) — optional until then.
   */
  momentsChanged?: boolean;
  /**
   * Server's verdict on whether the regenerate affordance should show
   * (决策 3 "有占位卡就可以生成"): Premium, the month has moments, nothing is
   * already in flight, and — for an already-generated month — the moments
   * actually changed. Clients render the strip on this alone.
   */
  canRegenerate?: boolean;
}

// GET /stories — current_month object
export interface CurrentMonthStatus {
  monthKey: string;
  listItemState: Extract<
    StoryListItemState,
    'current_collecting' | 'current_in_progress' | 'current_quota_exhausted' | 'current_generated'
  >;
  momentCount: number;
  daysUntilGeneration: number;
  milestoneLevel: null | '1' | '3' | '10' | '15+';
  // Populated when listItemState === 'current_generated' — lets the mobile
  // card show the title + navigate to /story/:storyId.
  storyId: string | null;
  title: string | null;
  coverImageUrl: string | null;
}

// Story watermark (stored in document, frozen at generation time per R-02)
export interface StoryWatermark {
  enabled: boolean;
  text: string;  // e.g. "Made with Nestory"
}

// Story visual theme (frozen at generation — historical stories never re-theme per R-02)
export interface StoryTheme {
  themeId: string;
  assignedAt: string;
  version: number;
}

// Story social meta
export interface StoryShareMeta {
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
}

// Story section types
export type SectionIntent =
  | 'cover'
  | 'summary'
  | 'narrative'
  | 'milestone'
  | 'reflection'
  | 'closing';

export type SectionOutputType = 'text' | 'photo' | 'photo_with_caption' | 'collage';

export interface StorySection {
  id: string;
  intent: SectionIntent;
  outputType: SectionOutputType;
  text?: string;
  assetFileIds?: string[];
}

// StoryDocument — stored in stories.document JSONB, consumed by story renderer
export interface StoryDocument {
  storyId: string;
  childId: string;
  monthKey: string;
  locale: string;             // e.g. "en-US"
  meta: {
    title: string;
    coverImageUrl: string;
    childAgeMonths: number;
  };
  theme: StoryTheme;
  watermark: StoryWatermark;
  shareMeta: StoryShareMeta;
  qualityLevel: 'low' | 'medium' | 'rich';
  sections: StorySection[];
}

// Generation metadata (stored in stories.generation_meta JSONB, for debugging)
export interface GenerationMeta {
  promptVersion: string;
  modelName: string;
  qualityLevel: 'low' | 'medium' | 'rich';
  qualityScore: number;
  generatedAt: string;
  generationDurationMs: number;
  failureTracking: {
    retries: number;
    usedFallback: boolean;
  };
}

// GET /stories/:id response
export interface StoryDetail {
  id: string;
  monthKey: string;
  status: StoryStatus;
  document: StoryDocument;
  generationMeta: GenerationMeta;
}

// GET /stories/:id/status response (lightweight poll during generation)
export interface StoryStatusPoll {
  id: string;
  status: StoryStatus;
  estimatedSecondsRemaining: number | null; // non-null only while 'generating'
}

// ─── Story document v3 (two-phase pipeline) ─────────────────────────────────
//
// The block/chapter structure from StoryH5Design v1.2 §4.3 + StoryGenPrompts
// v1.0. Coexists with the v2 `StoryDocument` above (flat `sections[]`, still
// the shipped format). A stored document is v3 iff `renderVersion === 3`;
// anything else is read as v2. Field names follow the codebase's camelCase
// convention, not the docs' snake_case JSON.

/** width:height. 16:9 is S-01 card only, never inside a Story (§3.6.3). */
export type PhotoRatio = '1:1' | '4:3' | '3:4';

export type BlockLayout =
  | 'Block-Text'        // 0 photos (all filtered out)
  | 'Block-Single-H'    // 1 landscape (4:3)
  | 'Block-Single-V-v1' // 1 portrait (3:4), short text
  | 'Block-Single-V-v2' // 1 portrait (3:4), long text
  | 'Block-Duo'         // 2 photos
  | 'Block-Grid';       // 3 photos (Hero + Duo slot)

export type CoverLayout = 'Cover-A' | 'Cover-B';

/**
 * A photo as rendered in a Story. `url` + `ratio` are always present; the
 * srcset/placeholder fields come from the §7.2 stage-2 pipeline (pre-cropped
 * WebP/JPEG variants) and are absent on documents generated before it — the
 * renderer degrades to plain `url` + object-fit.
 */
export interface StoryPhoto {
  url:               string;          // largest JPEG variant, or the original
  ratio:             PhotoRatio;
  srcsetWebp?:       string;          // "…750.webp 750w, …1500.webp 1500w"
  srcsetJpeg?:       string;
  placeholderColor?: string;          // "#rrggbb" LQIP, derived from blurhash
}

// A narrative unit = one Block. Photos are already filtered + cropped by the
// image layer; text comes from Prompt 2. `momentIds` may be >1 (merged unit).
export interface StoryBlock {
  momentIds:   string[];
  text:        string;                 // 30-50 words; empty allowed for Block-Text
  photos:      StoryPhoto[];           // ≤ 3, source-agnostic
  blockLayout: BlockLayout;
}

export interface StoryCoverSection {
  type:         'cover';
  layout:       CoverLayout;
  month:        string;                // "MAY 2026"
  childName:    string;
  subtitle:     string;                // ≤ 12 words (Prompt 2)
  coverPhotoUrl: string | null;        // Gold vertical for Cover-A; null for Cover-B
}

export interface StoryOpeningSection {
  type:       'opening';
  paragraphs: string[];                // 1-2 paragraphs
}

export interface StoryBodyChapter {
  type:            'body';
  chapterTitle:    string;             // ≤ 8 words
  narrativeThread: string;             // internal cohesion aid; not rendered
  blocks:          StoryBlock[];
}

export interface StoryClosingSection {
  type:     'closing';
  headline: string;                    // fixed product copy, NOT LLM-generated
  stats:    { moments: number; photos: number }; // month totals, incl. non-shown
}

// StoryDocument v3 — stored in stories.document JSONB when pipeline = two-phase-v3
export interface StoryDocumentV3 {
  renderVersion: 3;
  storyId:  string;
  childId:  string;
  monthKey: string;
  locale:   string;
  meta: {
    title:          string;
    childAgeMonths: number;
  };
  theme:     StoryTheme;
  watermark: StoryWatermark;
  shareMeta: StoryShareMeta;
  qualityLevel: 'low' | 'medium' | 'rich';
  cover:    StoryCoverSection;
  opening:  StoryOpeningSection;
  body:     StoryBodyChapter[];        // 1-5 chapters (= themes)
  closing:  StoryClosingSection;
}

/** Either format may be stored; discriminate on `renderVersion`. */
export type AnyStoryDocument = StoryDocument | StoryDocumentV3;

export function isStoryDocumentV3(doc: AnyStoryDocument): doc is StoryDocumentV3 {
  return (doc as StoryDocumentV3).renderVersion === 3;
}
