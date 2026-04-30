// Highlights — aligns with POST /highlights and GET /highlights responses

// Embedded asset summary inside a Highlight list item
export interface HighlightAsset {
  fileUrls: string[];       // ordered by display_order
  textNote: string | null;
  tags: string[];
  capturedAt: string;
}

// GET /highlights response item
export interface Highlight {
  id: string;
  assetId: string;
  coverFileId: string | null;          // asset_files.id; null if cover was deleted
  coverOrientation: 'portrait' | 'landscape'; // derived from cover file width/height; drives HL-01 card variant
  title: string | null;                // AI-generated or user-overwritten; null while pending
  cardType: string;                    // matched from tags, e.g. "playtime" | "outdoor" | "default"
  renderedImageUrl: string | null;     // async render; null while pending
  asset: HighlightAsset;
  createdAt: string;
}

// POST /highlights body
export interface HighlightCreate {
  assetId: string;
  childId: string;
  coverFileId?: string;   // required when asset has multiple photos; omit for single-photo assets
}

// POST /highlights response meta
export interface HighlightMeta {
  highlightCount: number;
  highlightLimit: number | null;  // null for Premium users
}
