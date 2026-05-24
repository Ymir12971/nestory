// Sets a password on the demo OAuth user so it can sign in with email+password
// (works on no-GMS devices / mainland networks, unlike Google OAuth).
//
// The user already exists (created via Google sign-in), so this only adds a
// password credential — same user id, same seeded data.
//
// Run:  pnpm --filter @nestory/api exec tsx --env-file=.env prisma/set-demo-password.ts
//   override:  DEMO_USER_ID=<uuid> DEMO_PASSWORD=<pw> pnpm ... set-demo-password.ts

import { createClient } from '@supabase/supabase-js';

const USER_ID  = process.env.DEMO_USER_ID  ?? '7f1d4806-7a71-4035-897c-e301ae0972eb';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'NestoryDemo2026!';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const { data, error } = await supabase.auth.admin.updateUserById(USER_ID, {
    password: PASSWORD,
    email_confirm: true, // ensure the account can use password sign-in
  });
  if (error) throw error;
  console.log('Password set for demo user:');
  console.log(`  id:       ${data.user?.id}`);
  console.log(`  email:    ${data.user?.email}`);
  console.log(`  password: ${PASSWORD}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
