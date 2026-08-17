import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryClient';
import { forceData, forceError, forceLoading } from './forceState';
import {
  FX_CHILD_ID,
  FX_MOMENT_ID,
  fxChild,
  fxChild2,
  fxCurrentMonth,
  fxMoment,
  fxMoments,
  fxMonths,
  fxStoryItem,
  fxSubFree,
  fxSubPremium,
  fxSubPremiumEnded,
  fxSubQuotaGone,
  fxUser,
} from './fixtures';

export type GalleryModule = 'Onboarding' | 'Home' | 'Stories' | 'Settings' | 'Global';

export interface GalleryCase {
  id: string;
  module: GalleryModule;
  /** Frame name as it reads in Figma, so the two lists line up. */
  label: string;
  /** Figma node id — paste into the plugin/URL to pull the frame up beside it. */
  nodeId: string;
  route: string;
  /** Seeds the shared cache so the real screen renders this state. */
  prepare?: (qc: QueryClient) => void;
  /** Set when the frame can't be reached by using the app normally. */
  hardToReach?: boolean;
  note?: string;
}

const thisMonth = fxMonths[0]!.monthKey;

/** Baseline every Home/Stories/Settings case starts from. */
function base(qc: QueryClient, opts: { sub?: typeof fxSubFree; children?: typeof fxChild[] } = {}) {
  forceData(qc, queryKeys.user, fxUser);
  forceData(qc, queryKeys.subscription, opts.sub ?? fxSubFree);
  forceData(qc, queryKeys.children, opts.children ?? [fxChild]);
}

function homeData(qc: QueryClient, moments: typeof fxMoments, months = fxMonths) {
  forceData(qc, queryKeys.assetMonths(FX_CHILD_ID), months);
  forceData(qc, queryKeys.assets(FX_CHILD_ID), moments);
  forceData(qc, queryKeys.assets(FX_CHILD_ID, thisMonth), moments);
}

function storiesData(
  qc: QueryClient,
  currentMonth: ReturnType<typeof fxCurrentMonth>,
  historical: ReturnType<typeof fxStoryItem>[] = [],
) {
  const payload = { currentMonth, historical };
  forceData(qc, queryKeys.assetMonths(FX_CHILD_ID), fxMonths);
  forceData(qc, queryKeys.stories(FX_CHILD_ID), payload);
  forceData(qc, queryKeys.stories(FX_CHILD_ID, new Date().getFullYear()), payload);
}

export const GALLERY_CASES: GalleryCase[] = [
  // ── Home ──────────────────────────────────────────────────────────────────
  {
    id: 'home-empty', module: 'Home', label: 'Home Empty', nodeId: '731:1270', route: '/(tabs)',
    prepare: (qc) => { base(qc); homeData(qc, [], []); },
  },
  {
    id: 'home-empty-multi', module: 'Home', label: 'Home Empty · Multiple Children', nodeId: '733:1178', route: '/(tabs)',
    prepare: (qc) => { base(qc, { children: [fxChild, fxChild2] }); homeData(qc, [], []); },
  },
  {
    id: 'home-first', module: 'Home', label: 'First Memory', nodeId: '731:1304', route: '/(tabs)',
    prepare: (qc) => { base(qc); homeData(qc, [fxMoments[0]!], [fxMonths[0]!]); },
  },
  {
    id: 'home-list', module: 'Home', label: 'Normal Memory list', nodeId: '731:1370', route: '/(tabs)',
    prepare: (qc) => { base(qc); homeData(qc, fxMoments); },
  },
  {
    id: 'home-month-empty', module: 'Home', label: 'Current month empty', nodeId: '731:2572', route: '/(tabs)',
    hardToReach: true,
    note: '需要「有历史月份但本月为空」——真机上要等跨月',
    prepare: (qc) => { base(qc); homeData(qc, [], fxMonths.slice(1)); },
  },
  {
    id: 'home-error', module: 'Home', label: "Memories couldn't load", nodeId: '774:3710', route: '/(tabs)',
    hardToReach: true, note: '真机上要断网或让接口报错',
    prepare: (qc) => {
      base(qc);
      forceData(qc, queryKeys.assetMonths(FX_CHILD_ID), fxMonths);
      forceError(qc, queryKeys.assets(FX_CHILD_ID, thisMonth));
      forceError(qc, queryKeys.assets(FX_CHILD_ID));
    },
  },
  {
    id: 'home-loading', module: 'Home', label: 'Home · loading', nodeId: '—', route: '/(tabs)',
    hardToReach: true, note: '稿外状态；本地接口太快，正常看不到',
    prepare: (qc) => { base(qc); forceLoading(qc, queryKeys.assetMonths(FX_CHILD_ID)); forceLoading(qc, queryKeys.assets(FX_CHILD_ID, thisMonth)); },
  },
  {
    id: 'moment-view', module: 'Home', label: 'View Memory', nodeId: '741:2133', route: `/moment/${FX_MOMENT_ID}`,
    prepare: (qc) => { base(qc); forceData(qc, queryKeys.asset(FX_MOMENT_ID), fxMoment()); },
  },
  {
    id: 'moment-readonly', module: 'Home', label: 'NoPremium request to edit', nodeId: '744:3627', route: `/moment/${FX_MOMENT_ID}`,
    hardToReach: true, note: '需要一条已用于生成 Story 的过往月 Moment',
    prepare: (qc) => {
      base(qc);
      forceData(qc, queryKeys.asset(FX_MOMENT_ID), fxMoment({
        isEditable: false, linkedHighlight: { id: 'h1', title: 'First steps' },
      }));
    },
  },
  {
    id: 'moment-edit', module: 'Home', label: 'Edit Memory Page', nodeId: '743:4822', route: `/moment/${FX_MOMENT_ID}/edit`,
    prepare: (qc) => { base(qc); forceData(qc, queryKeys.asset(FX_MOMENT_ID), fxMoment()); },
  },
  {
    id: 'moment-detail-error', module: 'Home', label: 'Memory detail · load failed', nodeId: '—', route: `/moment/${FX_MOMENT_ID}`,
    hardToReach: true,
    prepare: (qc) => { base(qc); forceError(qc, queryKeys.asset(FX_MOMENT_ID)); },
  },
  { id: 'moment-add', module: 'Home', label: 'Add Memory page Empty', nodeId: '742:3144', route: '/moment/add', prepare: base },
  { id: 'moment-add-note', module: 'Home', label: 'Add from "Just a note"', nodeId: '741:2053', route: '/moment/add?mode=note', prepare: base },

  // ── Stories ───────────────────────────────────────────────────────────────
  {
    id: 'story-empty', module: 'Stories', label: 'Story Empty', nodeId: '821:1534', route: '/(tabs)/stories',
    prepare: (qc) => { base(qc); storiesData(qc, fxCurrentMonth({ momentCount: 0, milestoneLevel: null })); },
  },
  {
    id: 'story-generating', module: 'Stories', label: 'First Story Generating', nodeId: '731:1547', route: '/(tabs)/stories',
    hardToReach: true, note: '生成只要 15 秒，手动几乎抓不住这一帧',
    prepare: (qc) => { base(qc); storiesData(qc, fxCurrentMonth({ listItemState: 'current_in_progress' })); },
  },
  {
    id: 'story-collecting', module: 'Stories', label: 'Normal Generation', nodeId: '731:1515', route: '/(tabs)/stories',
    prepare: (qc) => { base(qc); storiesData(qc, fxCurrentMonth(), [fxStoryItem()]); },
  },
  {
    id: 'story-no-moments', module: 'Stories', label: 'No Memory to generate', nodeId: '731:3280', route: '/(tabs)/stories',
    hardToReach: true,
    prepare: (qc) => {
      base(qc);
      storiesData(qc, fxCurrentMonth({ momentCount: 0 }), [
        fxStoryItem({ id: null, status: null, listItemState: 'historical_not_generated', title: null, coverImageUrl: null, momentCount: null, generatedAt: null, watermarkEnabled: null }),
      ]);
    },
  },
  {
    id: 'story-quota-gone', module: 'Stories', label: 'Free quota used / Premium Ended', nodeId: '731:3218', route: '/(tabs)/stories',
    hardToReach: true, note: '真机上要把 2 次免费额度真的用光',
    prepare: (qc) => {
      base(qc, { sub: fxSubQuotaGone });
      storiesData(qc, fxCurrentMonth({ listItemState: 'current_quota_exhausted' }), [fxStoryItem()]);
    },
  },
  {
    id: 'story-premium-ended', module: 'Stories', label: 'Story paused · Premium ended', nodeId: '731:3218', route: '/(tabs)/stories',
    hardToReach: true,
    prepare: (qc) => {
      base(qc, { sub: fxSubPremiumEnded });
      storiesData(qc, fxCurrentMonth({ listItemState: 'current_quota_exhausted' }), [fxStoryItem()]);
    },
  },
  {
    id: 'story-recovered', module: 'Stories', label: 'Premium recovered', nodeId: '731:3426', route: '/(tabs)/stories',
    hardToReach: true,
    prepare: (qc) => { base(qc, { sub: fxSubPremium }); storiesData(qc, fxCurrentMonth(), [fxStoryItem(), fxStoryItem({ id: 'f1c70000-0000-4000-8000-000000000202', monthKey: fxMonths[2]!.monthKey })]); },
  },
  {
    id: 'story-regen', module: 'Stories', label: 'Regeneration allowed', nodeId: '761:2628', route: '/(tabs)/stories',
    hardToReach: true, note: '要 Premium + 生成后再改动 Moment',
    prepare: (qc) => {
      base(qc, { sub: fxSubPremium });
      storiesData(qc, fxCurrentMonth(), [fxStoryItem({ momentsChanged: true, canRegenerate: true })]);
    },
  },
  {
    id: 'story-error', module: 'Stories', label: "Stories couldn't load", nodeId: '774:3769', route: '/(tabs)/stories',
    hardToReach: true,
    prepare: (qc) => {
      base(qc);
      forceData(qc, queryKeys.assetMonths(FX_CHILD_ID), fxMonths);
      forceError(qc, queryKeys.stories(FX_CHILD_ID));
      forceError(qc, queryKeys.stories(FX_CHILD_ID, new Date().getFullYear()));
    },
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  { id: 'settings-free', module: 'Settings', label: 'Settings (free)', nodeId: '768:4581', route: '/(tabs)/settings', prepare: (qc) => base(qc) },
  { id: 'settings-premium', module: 'Settings', label: 'Settings (premium)', nodeId: '731:2891', route: '/(tabs)/settings', prepare: (qc) => base(qc, { sub: fxSubPremium }) },
  { id: 'plan-free', module: 'Settings', label: 'Current plan (Free)', nodeId: '764:3775', route: '/settings/subscription', prepare: (qc) => base(qc) },
  { id: 'plan-premium', module: 'Settings', label: 'Current plan (Premium)', nodeId: '764:3844', route: '/settings/subscription', prepare: (qc) => base(qc, { sub: fxSubPremium }) },
  { id: 'plan-cancelled', module: 'Settings', label: 'Plan cancelled', nodeId: '771:3205', route: '/settings/plan-cancelled', hardToReach: true, prepare: (qc) => base(qc, { sub: { ...fxSubPremium, status: 'cancelled' } }) },
  { id: 'account', module: 'Settings', label: 'Account', nodeId: '770:2604', route: '/settings/account', prepare: (qc) => base(qc) },
  { id: 'account-premium', module: 'Settings', label: 'Account (premium 注销提示)', nodeId: '770:2604', route: '/settings/account', hardToReach: true, prepare: (qc) => base(qc, { sub: fxSubPremium }) },
  { id: 'profile-edit-free', module: 'Settings', label: 'Child Profile Edit (free)', nodeId: '769:2487', route: `/settings/profiles/${FX_CHILD_ID}`, prepare: (qc) => { base(qc); forceData(qc, queryKeys.child(FX_CHILD_ID), fxChild); } },
  { id: 'profile-edit-premium', module: 'Settings', label: 'Child Profile Edit (premium)', nodeId: '769:2306', route: `/settings/profiles/${FX_CHILD_ID}`, prepare: (qc) => { base(qc, { sub: fxSubPremium }); forceData(qc, queryKeys.child(FX_CHILD_ID), fxChild); } },
  { id: 'feedback', module: 'Settings', label: 'Feedback', nodeId: '768:4295', route: '/settings/feedback', prepare: (qc) => base(qc) },
  { id: 'about', module: 'Settings', label: 'About', nodeId: '770:2583', route: '/settings/about', prepare: (qc) => base(qc) },
  { id: 'privacy-settings', module: 'Settings', label: 'Data & Privacy', nodeId: '770:2563', route: '/settings/privacy', prepare: (qc) => base(qc) },

  // ── Onboarding ────────────────────────────────────────────────────────────
  { id: 'welcome', module: 'Onboarding', label: 'Welcome-1 / Welcome-2', nodeId: '739:1085', route: '/onboarding/welcome' },
  { id: 'signin', module: 'Onboarding', label: 'Sign In', nodeId: '739:1134', route: '/onboarding/auth?preview=1',
    hardToReach: true, note: '登录状态下这屏会自动跳走，?preview=1 才停得住' },
  { id: 'privacy-claim', module: 'Onboarding', label: 'Privacy claim', nodeId: '752:1639', route: '/onboarding/privacy-claim' },
  { id: 'child-basic', module: 'Onboarding', label: 'Child basic info', nodeId: '739:1155', route: '/onboarding/profile' },
  { id: 'child-another', module: 'Onboarding', label: 'Child info (?another=1)', nodeId: '739:1256', route: '/onboarding/profile?another=1' },
  { id: 'children-list', module: 'Onboarding', label: 'Children list', nodeId: '750:2581', route: '/onboarding/children', prepare: (qc) => base(qc) },
  { id: 'children-list-more', module: 'Onboarding', label: 'Children list (more)', nodeId: '751:1334', route: '/onboarding/children', prepare: (qc) => base(qc, { children: [fxChild, fxChild2] }) },
  { id: 'notifications', module: 'Onboarding', label: 'Notification access', nodeId: '739:1940', route: '/onboarding/permissions' },
  { id: 'plan-yearly', module: 'Onboarding', label: 'Choose plan', nodeId: '739:1406', route: '/onboarding/plan', prepare: (qc) => base(qc) },
  { id: 'welcome-premium', module: 'Onboarding', label: 'Welcome to premium', nodeId: '761:2377', route: '/welcome-premium?cycle=yearly&from=onboarding', prepare: (qc) => base(qc, { sub: fxSubPremium }) },
  { id: 'terms', module: 'Onboarding', label: 'Terms of Service', nodeId: '739:1547', route: '/onboarding/terms' },
  { id: 'privacy-policy', module: 'Onboarding', label: 'Privacy Policy', nodeId: '739:1566', route: '/onboarding/privacy' },

  // ── Global ────────────────────────────────────────────────────────────────
  {
    id: 'paywall', module: 'Global', label: 'global-Paywall', nodeId: '775:1819',
    route: '/__overlay?name=paywall',
    hardToReach: true,
    note: '它是弹窗不是路由，四个屏各自持有 visible —— 走导航到不了，靠 __overlay 挂载',
    prepare: (qc) => base(qc),
  },
  {
    id: 'welcome-premium-global', module: 'Global', label: 'global-Welcome to premium', nodeId: '771:3311',
    route: '/welcome-premium?cycle=yearly',
    hardToReach: true,
    note: '与 O-Welcome to premium 同屏，区别只在 from：没有 from 就退回原位置',
    prepare: (qc) => base(qc, { sub: fxSubPremium }),
  },
  {
    id: 'account-deleted', module: 'Global', label: 'Account deleted gate (稿外)', nodeId: '—',
    route: `/onboarding/account-deleted?purgeAt=${encodeURIComponent(new Date(Date.now() + 30 * 864e5).toISOString())}`,
    hardToReach: true, note: '真机上要先注销账号再登录',
  },
];

export const GALLERY_MODULES: GalleryModule[] = ['Onboarding', 'Home', 'Stories', 'Settings', 'Global'];
