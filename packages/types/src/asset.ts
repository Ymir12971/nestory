// Memory (raw_asset) — aligns with POST /assets and GET /assets responses

export type AssetType = 'photo' | 'text' | 'mixed';
export type MimeType  = 'image/jpeg' | 'image/png' | 'image/heif';

// Single photo file within a Memory (asset_files row)
export interface MemoryFile {
  id: string;
  fileUrl: string;
  mimeType: MimeType;
  widthPx: number | null;   // null until server decodes
  heightPx: number | null;
  byteSize: number;
  displayOrder: number;     // 0-indexed, ascending
}

// GET /assets response item / POST /assets response
export interface Memory {
  id: string;
  childId: string;          // which child this memory belongs to
  assetType: AssetType;
  files: MemoryFile[];      // empty array for text-only memories
  textNote: string | null;
  tags: string[];           // value snapshot, e.g. ["Playtime", "第一次独站"]
  isHighlight: boolean;
  linkedHighlight: { id: string; title: string | null } | null; // M-04 detail page surfaces title
  capturedAt: string;       // ISO 8601, client local time (used for month grouping)
  isEditable: boolean;      // true = current month; false = historical read-only (R-08)
  deletedAt?: string;       // ISO 8601; only present in GET /assets/trash responses
}

// POST /assets — multipart/form-data (types are illustrative; actual upload uses FormData)
export interface MemoryCreate {
  childId: string;          // required
  capturedAt: string;       // required, ISO 8601
  textNote?: string;        // ≤ 500 chars
  tagValues?: string[];     // tag name strings; new custom tags auto-added to user_tag_library
  isHighlight?: boolean;
  // photos: File[]         // attached as multipart; ≤ 10 files, ≤ 10MB each, JPEG/PNG/HEIF
}

// PATCH /assets/:id — multipart/form-data
export interface MemoryPatch {
  textNote?: string;
  tagValues?: string[];     // full replacement of tags array
  isHighlight?: boolean;
  // addPhotos: File[]       // append to asset_files, display_order continues
  // removeFileIds: string[] // asset_files.id list to delete
  // reorderFileIds: string[] // full reorder; mutually exclusive with addPhotos
}

// Used by AI generation pipeline (story generation worker)
export interface CandidateMomentGroup {
  momentId: string;
  rawAssetIds: string[];
  capturedRange: { start: string; end: string };
  qualityScore: number;
}
