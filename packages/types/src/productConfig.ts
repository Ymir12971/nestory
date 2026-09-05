// Product-level tunable constraints — single source of truth for both the
// mobile client (UI enforcement) and the API (validation). Values come from
// the 2026-07 redesign handoff + Figma annotations; where the two disagreed,
// Justin's calls (2026-07-15) are recorded inline.

export const MOMENT_CONSTRAINTS = {
  /** Max photos per Moment. Redesign lowered this from 10 → 9 (Figma H-Add annotation). */
  maxPhotos: 9,
  /**
   * Max text-note length. Handoff says 500 characters; one Figma annotation
   * says "500 words" — Justin 2026-07-15: count CHARACTERS for now, revisit if needed.
   */
  maxTextChars: 500,
  /** Redesign: text is REQUIRED to save (photos alone can't save); photos optional. */
  textRequiredToSave: true,
  /** Per-photo upload cap in bytes (handoff §4: ≤ 10MB). */
  maxPhotoBytes: 10 * 1024 * 1024,
} as const;

/**
 * Entry options shown in the Add Moment popup, in display order.
 * Justin 2026-07-15 added a third, "Take a photo"; Justin 2026-09-04 removed it
 * again — the product takes no photos at all now, every photo comes from the
 * album. Back to the two the Figma annotation listed.
 */
export type AddMomentEntryOption = 'note' | 'album';
export const ADD_MOMENT_ENTRY_OPTIONS: readonly AddMomentEntryOption[] = [
  'note',    // "Just a Note" — text-only fast path
  'album',   // "Choose from Album"
] as const;

/** Feedback form shares the photo flow with Moment but has its own activation rule. */
export const FEEDBACK_CONSTRAINTS = {
  maxPhotos: 9,
  maxTextChars: 500,
  /** Unlike Add Moment: EITHER text or photos activates Send (Figma ST-feedback annotation). */
  textRequiredToSave: false,
} as const;
