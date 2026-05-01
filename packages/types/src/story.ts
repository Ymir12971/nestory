// Story — aligns with GET /stories, GET /stories/:id, GET /stories/:id/status

export type StoryStatus =
  | 'pending'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'fallback_generated';

// Returned by backend in list and detail; frontend renders directly without deriving
// current month states come from current_month.list_item_state
// historical states come from data[].list_item_state
export type StoryListItemState =
  | 'current_collecting'       // current month, memories accumulating
  | 'current_in_progress'      // current month, generation triggered/running
  | 'current_quota_exhausted'  // current month, Free quota used up (R-01)
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
  memoryCount: number | null;           // null when no story; count of memories used to generate
}

// GET /stories — current_month object
export interface CurrentMonthStatus {
  monthKey: string;
  listItemState: Extract<StoryListItemState, 'current_collecting' | 'current_in_progress' | 'current_quota_exhausted'>;
  memoryCount: number;
  daysUntilGeneration: number;
  milestoneLevel: null | '1' | '3' | '10' | '15+';
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
