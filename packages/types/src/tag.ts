// Tags — GET /tags (preset) and GET /tags/user (custom library)

// GET /tags — 8 preset tags as ordered string array; order is intrinsic to the array
export type PresetTag = string;

// GET /tags/user — user's reusable custom tag library (user_tag_library rows)
// Deleting a UserTag does NOT affect raw_assets.tags strings (orphan chip semantics)
export interface UserTag {
  name: string;
  createdAt: string;
}
