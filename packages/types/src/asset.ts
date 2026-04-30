export interface RawAsset {
  id: string;
  childId: string;
  capturedAt: string;
  monthKey: string;
  description?: string;
  tagIds: string[];
  isHighlight: boolean;
}

export interface AssetFile {
  id: string;
  rawAssetId: string;
  storagePath: string;
  width: number;
  height: number;
  bytes: number;
  mimeType: string;
  orderIndex: number;
}

export interface CandidateMomentGroup {
  momentId: string;
  rawAssetIds: string[];
  capturedRange: { start: string; end: string };
  qualityScore: number;
}
