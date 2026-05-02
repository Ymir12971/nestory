// Tags — GET /tags (preset) and GET /user/tags (custom library)

// GET /tags — 8 preset tags from packages/config/nestory/tags.ts (never stored in DB)
export interface PresetTag {
  name: string;
  displayOrder: number;
}

// GET /user/tags — user's reusable custom tag library (user_tag_library rows)
// Deleting a UserTag does NOT affect raw_assets.tags strings (orphan chip semantics)
export interface UserTag {
  name: string;
  createdAt: string;
}
