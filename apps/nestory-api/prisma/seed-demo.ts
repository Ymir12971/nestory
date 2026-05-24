// Demo data seed for a REAL (OAuth) user — for showing the app to a partner.
//
// Populates one child + a few current-month photo memories + 2 highlights +
// one fully-rendered past-month Story, so the app isn't empty on first open
// and "view AI Story" works immediately.
//
// Idempotent: fixed UUIDs + upserts, safe to re-run. Writes to whatever
// DATABASE_URL points at (our local .env already points at the shared Supabase
// project, which is the same DB Railway/the APK read).
//
// Run:  pnpm --filter @nestory/api exec tsx --env-file=.env prisma/seed-demo.ts
//   override target user:  DEMO_USER_ID=<uuid> pnpm ... seed-demo.ts
//
// Photos use picsum.photos (always reachable, deterministic). For an on-brand
// demo, add a couple of real baby photos through the app itself — that also
// shows off the capture/upload flow.

import { PrismaClient } from '@prisma/client';
import type { StoryDocument } from '@nestory/types';

const USER_ID = process.env.DEMO_USER_ID ?? '7f1d4806-7a71-4035-897c-e301ae0972eb';

// Stable UUIDs so re-running upserts instead of duplicating.
const CHILD_ID = 'c1d10001-0000-4000-8000-000000000001';
const A = {
  bath:  'a55e0001-0000-4000-8000-000000000001',
  panc:  'a55e0002-0000-4000-8000-000000000002',
  steps: 'a55e0003-0000-4000-8000-000000000003',
  nap:   'a55e0004-0000-4000-8000-000000000004',
};
const F = {
  bath:   'f11e0001-0000-4000-8000-000000000001',
  panc1:  'f11e0002-0000-4000-8000-000000000002',
  panc2:  'f11e0003-0000-4000-8000-000000000003',
  steps:  'f11e0004-0000-4000-8000-000000000004',
  nap:    'f11e0005-0000-4000-8000-000000000005',
};
const H = {
  bath:  'b1607001-0000-4000-8000-000000000001',
  steps: 'b1607002-0000-4000-8000-000000000002',
};
const STORY_ID = '5703ed01-0000-4000-8000-000000000001';

const img = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const prisma = new PrismaClient();

async function main() {
  const dbHost = (process.env.DATABASE_URL ?? '<unset>').replace(/^[^@]+@/, '').replace(/\?.*$/, '');
  console.log(`Seeding demo data for user ${USER_ID} → ${dbHost}`);

  // --- User + subscription (should already exist from login; upsert to be safe) ---
  await prisma.user.upsert({
    where:  { id: USER_ID },
    update: {},
    create: { id: USER_ID, email: 'justin@blakard.com', name: 'Justin', timezone: 'America/Los_Angeles' },
  });
  await prisma.subscription.upsert({
    where:  { userId: USER_ID },
    update: {},
    create: { userId: USER_ID, subscriptionStatus: 'never_paid', planType: 'free', status: 'active', storyQuota: 2 },
  });

  // --- Child Emma ---
  await prisma.child.upsert({
    where:  { id: CHILD_ID },
    update: {},
    create: {
      id:               CHILD_ID,
      userId:           USER_ID,
      name:             'Emma',
      birthDate:        new Date('2024-09-10'),
      gender:           'girl',
      avatarUrl:        img('emma-avatar', 200, 200),
      heightValue:      82.5,
      heightUnit:       'cm',
      heightRecordedAt: new Date('2026-05-01T10:00:00Z'),
      weightValue:      11.2,
      weightUnit:       'kg',
      weightRecordedAt: new Date('2026-05-01T10:00:00Z'),
    },
  });
  await prisma.user.update({ where: { id: USER_ID }, data: { activeChildId: CHILD_ID } });

  // --- Current-month memories (2026-05) ---
  const memories: {
    id: string; capturedAt: string; textNote: string; isHighlight: boolean;
    files: { id: string; seed: string; w: number; h: number; order: number }[];
  }[] = [
    { id: A.bath, capturedAt: '2026-05-04T18:30:00Z', isHighlight: true,
      textNote: 'First real splash in the bathtub — giggles everywhere 🛁',
      files: [{ id: F.bath, seed: 'emma-bath', w: 800, h: 1000, order: 0 }] },
    { id: A.panc, capturedAt: '2026-05-11T09:15:00Z', isHighlight: false,
      textNote: 'Sunday pancakes. Wore more than she ate 🥞',
      files: [
        { id: F.panc1, seed: 'emma-pancake', w: 800, h: 1000, order: 0 },
        { id: F.panc2, seed: 'emma-pancake2', w: 1000, h: 800, order: 1 },
      ] },
    { id: A.steps, capturedAt: '2026-05-17T16:40:00Z', isHighlight: true,
      textNote: 'Three whole steps before the big tumble! 👣',
      files: [{ id: F.steps, seed: 'emma-steps', w: 1200, h: 800, order: 0 }] },
    { id: A.nap, capturedAt: '2026-05-20T13:00:00Z', isHighlight: false,
      textNote: 'Nap time with her favourite bunny 🐰',
      files: [{ id: F.nap, seed: 'emma-nap', w: 800, h: 1000, order: 0 }] },
  ];

  for (const m of memories) {
    await prisma.rawAsset.upsert({
      where:  { id: m.id },
      update: {},
      create: {
        id:          m.id,
        childId:     CHILD_ID,
        userId:      USER_ID,
        assetType:   'photo',
        textNote:    m.textNote,
        capturedAt:  new Date(m.capturedAt),
        tags:        [],
        isHighlight: m.isHighlight,
      },
    });
    for (const f of m.files) {
      await prisma.assetFile.upsert({
        where:  { id: f.id },
        update: {},
        create: {
          id:           f.id,
          assetId:      m.id,
          fileUrl:      img(f.seed, f.w, f.h),
          storagePath:  `demo/${f.seed}.jpg`,
          mimeType:     'image/jpeg',
          widthPx:      f.w,
          heightPx:     f.h,
          byteSize:     250_000,
          displayOrder: f.order,
        },
      });
    }
  }

  // --- Highlights (bath + steps) ---
  await prisma.highlight.upsert({
    where:  { assetId: A.bath },
    update: {},
    create: { id: H.bath, userId: USER_ID, childId: CHILD_ID, assetId: A.bath, coverFileId: F.bath, title: 'Bath time giggles', cardType: 'default' },
  });
  await prisma.highlight.upsert({
    where:  { assetId: A.steps },
    update: {},
    create: { id: H.steps, userId: USER_ID, childId: CHILD_ID, assetId: A.steps, coverFileId: F.steps, title: 'First steps', cardType: 'milestone' },
  });

  // --- Past-month Story (2026-04), fully generated so the renderer has content ---
  const coverUrl = img('emma-story-cover', 1200, 800);
  const document: StoryDocument = {
    storyId:  STORY_ID,
    childId:  CHILD_ID,
    monthKey: '2026-04',
    locale:   'en-US',
    meta:     { title: 'The Month Emma Found Her Feet', coverImageUrl: coverUrl, childAgeMonths: 19 },
    theme:    { themeId: 'warm-spring', assignedAt: '2026-05-01T00:00:00Z', version: 1 },
    watermark:{ enabled: true, text: 'Made with Nestory' },
    shareMeta:{
      ogTitle:       "Emma's April Story",
      ogDescription: 'A month of first steps, splashy baths, and sleepy bunny cuddles.',
      ogImageUrl:    coverUrl,
    },
    qualityLevel: 'rich',
    sections: [
      { id: 's-cover', intent: 'cover', outputType: 'photo', assetFileIds: [F.steps] },
      { id: 's-sum', intent: 'summary', outputType: 'text',
        text: 'April was the month the world got bigger. Emma traded careful crawls for wobbly, triumphant steps — and decided that bath water was the best toy ever invented.' },
      { id: 's-nar', intent: 'narrative', outputType: 'text',
        text: 'It started slowly. A hand let go of the coffee table, a breath held, and then — one step. Two. By the end of the month she was chasing the cat across the living room, arms out like a tiny tightrope walker.\n\nMornings were for pancakes she mostly wore, and evenings ended with splashes that left the bathroom floor a small lake. Every day had its own little headline.' },
      { id: 's-mile', intent: 'milestone', outputType: 'text',
        text: '🎉 Milestone: First independent steps — three of them, on April 17th, before a very dramatic (and very fine) tumble.' },
      { id: 's-ref', intent: 'reflection', outputType: 'text',
        text: 'Watching her find her balance, you could see her deciding the world was hers to explore. There is no going back to stillness now.' },
      { id: 's-close', intent: 'closing', outputType: 'text',
        text: 'On to May, one wobbly step at a time. 💛' },
    ],
  };

  await prisma.story.upsert({
    where:  { childId_monthKey: { childId: CHILD_ID, monthKey: '2026-04' } },
    update: { document: document as object, status: 'generated' },
    create: {
      id:                 STORY_ID,
      childId:            CHILD_ID,
      userId:             USER_ID,
      monthKey:           '2026-04',
      status:             'generated',
      qualityLevel:       'rich',
      promptVersion:      'demo-seed',
      modelName:          'demo',
      generatedAt:        new Date('2026-05-01T02:00:00Z'),
      generatedUnderPlan: 'free',
      isLastFreeStory:    false,
      document:           document as object,
    },
  });

  console.log('Demo seed completed:');
  console.log(`  Child:      Emma (${CHILD_ID})`);
  console.log(`  Memories:   ${memories.length} (current month 2026-05)`);
  console.log('  Highlights: 2');
  console.log('  Story:      2026-04 "The Month Emma Found Her Feet" (generated)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
