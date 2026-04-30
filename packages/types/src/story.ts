export type StoryStatus = 'pending' | 'generating' | 'completed' | 'failed';

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

export interface StoryDocument {
  storyId: string;
  childId: string;
  monthKey: string;
  themeId: string;
  sections: StorySection[];
  generatedAt: string;
  meta: GenerationMeta;
}

export interface GenerationMeta {
  qualityLevel: 'low' | 'medium' | 'rich';
  pipelineVersion: string;
  promptVersion: string;
}

export type StoryListItemState =
  | 'current_empty'
  | 'current_collecting'
  | 'current_locked'
  | 'current_generating'
  | 'history_generated'
  | 'history_generated_light'
  | 'history_not_generated';
