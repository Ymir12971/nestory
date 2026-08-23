import type {
  Child,
  CurrentMonthStatus,
  Moment,
  StoryListItem,
  Subscription,
  User,
} from '@nestory/types';

/**
 * Fixture data for the frame gallery. Stable ids so a case can seed a
 * key like `queryKeys.asset(FIXTURE_MOMENT_ID)` and then navigate to
 * `/moment/<that id>` and have the real screen find it.
 */
// Real UUIDs. The old readable ids ('fixture-child-…') failed the server's
// zod `.uuid()` check, so anything that escaped the cache came back 400 rather
// than a clean 404 — noise that looked like a bug in the screen.
export const FX_CHILD_ID  = 'f1c70000-0000-4000-8000-000000000001';
export const FX_CHILD2_ID = 'f1c70000-0000-4000-8000-000000000002';
export const FX_MOMENT_ID = 'f1c70000-0000-4000-8000-000000000101';
export const FX_STORY_ID  = 'f1c70000-0000-4000-8000-000000000201';

const PHOTO = 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=60';

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
}
function monthKey(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const fxUser: User = {
  id: 'fixture-user',
  email: 'gallery@nestory.local',
  name: 'Gallery User',
  timezone: 'America/Los_Angeles',
  linkedProviders: [
    { provider: 'google', providerEmail: 'gallery@nestory.local', connectedAt: monthsAgo(6) },
  ],
  createdAt: monthsAgo(6),
  storyNotificationsEnabled: true,
  uploadRemindersEnabled: true,
};

export const fxChild: Child = {
  id: FX_CHILD_ID,
  name: 'Emma',
  birthDate: '2024-08-15',
  gender: 'girl',
  relationship: 'Mom',
  avatarUrl: null,
  ageMonths: 23,
  heightValue: 84.5,
  heightUnit: 'cm',
  heightRecordedAt: monthsAgo(1),
  weightValue: 11.2,
  weightUnit: 'kg',
  weightRecordedAt: monthsAgo(1),
  isActive: true,
  createdAt: monthsAgo(6),
};

export const fxChild2: Child = {
  ...fxChild,
  id: FX_CHILD2_ID,
  name: 'Leo',
  gender: 'boy',
  birthDate: '2022-03-02',
  ageMonths: 53,
  isActive: false,
};

export const fxSubFree: Subscription = {
  planType: 'free',
  subscriptionStatus: 'never_paid',
  status: 'active',
  billingCycle: null,
  storyQuotaRemaining: 2,
  expiresAt: null,
  benefits: ['1 active child profile', '2 Stories in total'],
  highlightCount: 0,
  highlightLimit: 3,
  activeChildId: FX_CHILD_ID,
};

export const fxSubQuotaGone: Subscription = {
  ...fxSubFree,
  subscriptionStatus: 'trial_ended',
  storyQuotaRemaining: 0,
};

export const fxSubPremium: Subscription = {
  ...fxSubFree,
  planType: 'premium',
  subscriptionStatus: 'premium_active',
  billingCycle: 'yearly',
  storyQuotaRemaining: null,
  expiresAt: monthsAgo(-11),
  benefits: ['Unlimited children', 'Unlimited Stories', 'Regenerate any month'],
  highlightLimit: null,
};

export const fxSubPremiumEnded: Subscription = {
  ...fxSubFree,
  subscriptionStatus: 'premium_ended',
  status: 'expired',
};

export function fxMoment(over: Partial<Moment> = {}): Moment {
  return {
    id: FX_MOMENT_ID,
    childId: FX_CHILD_ID,
    assetType: 'mixed',
    files: [
      { id: 'f1', fileUrl: PHOTO, mimeType: 'image/jpeg', widthPx: 1200, heightPx: 1600, byteSize: 240_000, displayOrder: 0 },
    ],
    textNote: 'She stood on her own for a whole four seconds today, then sat down looking very pleased.',
    isHighlight: false,
    linkedHighlight: null,
    capturedAt: monthsAgo(0),
    isEditable: true,
    ...over,
  };
}

export const fxMoments: Moment[] = [
  fxMoment(),
  fxMoment({ id: 'f1c70000-0000-4000-8000-000000000102', textNote: 'First taste of watermelon. Verdict: enthusiastic.', capturedAt: monthsAgo(0) }),
  fxMoment({ id: 'f1c70000-0000-4000-8000-000000000103', assetType: 'text', files: [], textNote: 'Said something that was almost "dog".', capturedAt: monthsAgo(0) }),
];

export const fxMonths = [0, 1, 2, 3].map(n => ({ monthKey: monthKey(n), count: 3 }));

/** Reaches back past January so the Stories year filter has two years in it. */
export const fxCrossYearMonths = Array.from({ length: 15 }, (_, n) => ({
  monthKey: monthKey(n),
  count: 3,
}));

export function fxCurrentMonth(over: Partial<CurrentMonthStatus> = {}): CurrentMonthStatus {
  return {
    monthKey: monthKey(0),
    listItemState: 'current_collecting',
    momentCount: 3,
    daysUntilGeneration: 12,
    milestoneLevel: '3',
    storyId: null,
    title: null,
    coverImageUrl: null,
    ...over,
  };
}

export function fxStoryItem(over: Partial<StoryListItem> = {}): StoryListItem {
  return {
    id: FX_STORY_ID,
    monthKey: monthKey(1),
    status: 'generated',
    listItemState: 'historical_generated',
    coverImageUrl: PHOTO,
    title: 'The Month She Found Her Feet',
    isLastFreeStory: false,
    watermarkEnabled: true,
    generatedAt: monthsAgo(1),
    momentCount: 8,
    ...over,
  };
}
