// End-to-end verification that the live Anthropic story-generation path works.
//
// By default targets MONTH_KEY=2026-05 (the month that actually has seeded
// memories), leaving the existing 2026-04 *mock* story untouched so you can
// compare mock vs real side by side in the app's Stories list.
//
//   1. If a 2026-05 story already exists, delete it (clean re-gen).
//   2. POST /internal/stories/generate with ADMIN_TOKEN to enqueue.
//   3. Poll the DB until status='generated' (or fail/timeout).
//   4. Print model name, quality, title, and narrative — and flag whether the
//      `modelName` column says 'mock' or a real Anthropic id.
//
// Run:
//   ADMIN_TOKEN=<token> pnpm --filter @nestory/api exec tsx --env-file=.env \
//     prisma/verify-real-ai.ts

import { PrismaClient } from '@prisma/client';
import type { StoryDocument } from '@nestory/types';

const API_URL     = process.env.API_URL     ?? 'https://nestoryapi-production.up.railway.app';
const CHILD_ID    = process.env.CHILD_ID    ?? 'c1d10001-0000-4000-8000-000000000001';
const MONTH_KEY   = process.env.MONTH_KEY   ?? '2026-05';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error('ADMIN_TOKEN env var required (match the value you set on Railway).');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  // 1. Delete existing row so the worker regenerates instead of skipping.
  const existing = await prisma.story.findUnique({
    where: { childId_monthKey: { childId: CHILD_ID, monthKey: MONTH_KEY } },
  });
  if (existing) {
    await prisma.story.delete({ where: { id: existing.id } });
    console.log(`Deleted existing story ${existing.id} (${MONTH_KEY})`);
  } else {
    console.log(`No existing ${MONTH_KEY} story — starting clean`);
  }

  // 2. Enqueue.
  const res = await fetch(`${API_URL}/internal/stories/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ childId: CHILD_ID, monthKey: MONTH_KEY }),
  });
  if (!res.ok) {
    console.error(`Enqueue failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const enqueueBody = await res.json() as { data: { jobId: string } };
  console.log(`Enqueued jobId=${enqueueBody.data.jobId}`);

  // 3. Poll DB until done.
  console.log('Polling DB for completion (up to 5 minutes)…');
  for (let i = 1; i <= 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const story = await prisma.story.findUnique({
      where: { childId_monthKey: { childId: CHILD_ID, monthKey: MONTH_KEY } },
    });
    if (!story) {
      console.log(`  [${i * 5}s] no story row yet`);
      continue;
    }
    console.log(`  [${i * 5}s] status=${story.status}`);
    if (story.status === 'generated' || story.status === 'fallback_generated') {
      const doc = story.document as StoryDocument | null;
      console.log('\n========== GENERATED STORY ==========');
      console.log(`model:        ${story.modelName}`);
      console.log(`quality:      ${story.qualityLevel}`);
      console.log(`generatedAt:  ${story.generatedAt?.toISOString()}`);
      console.log(`title:        ${doc?.meta.title}`);
      console.log(`ogDesc:       ${doc?.shareMeta.ogDescription}`);
      console.log(`sections:     ${doc?.sections.length}`);
      const narr = doc?.sections.find(s => s.intent === 'narrative');
      if (narr?.text) {
        console.log('\nNarrative section:\n' + narr.text);
      }
      console.log('=====================================');
      if (story.modelName === 'mock') {
        console.log('\n⚠️  modelName=mock — Anthropic path NOT active on Railway.');
        console.log('   Set ANTHROPIC_API_KEY and unset STORY_AI_MOCK on Railway.');
        process.exit(2);
      } else {
        console.log(`\n✅ Real AI generation succeeded via ${story.modelName}`);
      }
      process.exit(0);
    }
    if (story.status === 'failed') {
      console.error('Generation FAILED. Story row:', JSON.stringify(story, null, 2));
      process.exit(1);
    }
  }
  console.error('Timed out after 5 minutes — worker may be slow or stuck');
  process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
