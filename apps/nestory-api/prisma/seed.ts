// Demo seed — idempotent.
//
// Creates a fixed demo user + subscription + 1 child so the dev mobile app
// (which sends `dev-<userId>` tokens for the same fixed userId) can hit the
// real API end-to-end without OAuth. Re-running is safe: every write uses
// upsert with stable UUIDs.
//
// Refuses to run against production unless SEED_FORCE=1 is set.
//
// Run via:  pnpm --filter @nestory/api prisma:seed
//   or:    pnpm --filter @nestory/api exec prisma db seed

import { PrismaClient } from '@prisma/client';

const DEMO_USER_ID  = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const DEMO_CHILD_ID = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';

if (process.env.NODE_ENV === 'production' && !process.env.SEED_FORCE) {
  throw new Error(
    'seed.ts refuses to run with NODE_ENV=production. Set SEED_FORCE=1 to override.',
  );
}

const prisma = new PrismaClient();

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? '<unset>';
  const dbHost = dbUrl.replace(/^[^@]+@/, '').replace(/\?.*$/, '');
  console.log(`Seeding demo data → ${dbHost}`);

  await prisma.user.upsert({
    where:  { id: DEMO_USER_ID },
    create: {
      id:       DEMO_USER_ID,
      email:    'demo@nestory.local',
      name:     'Demo User',
      timezone: 'America/Los_Angeles',
    },
    update: {},
  });

  await prisma.subscription.upsert({
    where:  { userId: DEMO_USER_ID },
    create: {
      userId:             DEMO_USER_ID,
      subscriptionStatus: 'never_paid',
      planType:           'free',
      status:             'active',
      storyQuota:         2,
    },
    update: {},
  });

  await prisma.child.upsert({
    where:  { id: DEMO_CHILD_ID },
    create: {
      id:        DEMO_CHILD_ID,
      userId:    DEMO_USER_ID,
      name:      'Emma',
      birthDate: new Date('2024-08-15'),
      gender:    'girl',
    },
    update: {},
  });

  await prisma.user.update({
    where: { id: DEMO_USER_ID },
    data:  { activeChildId: DEMO_CHILD_ID },
  });

  console.log('Demo seed completed');
  console.log(`  User:  ${DEMO_USER_ID}  (Demo User · never_paid)`);
  console.log(`  Child: ${DEMO_CHILD_ID}  (Emma · active)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
