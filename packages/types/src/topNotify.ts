// TopNotify event types — server returns null when no notify should show.
// Used by S-01 Stories list and HL-01 Highlights gallery.
//
// Priority (HL): hl_ended_over_limit > hl_ended_at_limit > hl_ended_under_limit > hl_free_at_limit
// Priority (S): stories_premium_ended > stories_trial_ended

export type TopNotifyStatus =
  // S-01 Stories
  | 'stories_trial_ended'
  | 'stories_premium_ended'
  // HL-01 Highlights — `kind` ('trial' | 'premium') swaps the prefix in display string
  | 'hl_free_at_limit'
  | 'hl_ended_under_limit'
  | 'hl_ended_at_limit'
  | 'hl_ended_over_limit';

export type TopNotifyKind = 'trial' | 'premium';
