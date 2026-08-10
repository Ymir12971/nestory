import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { PURGE_AFTER_DAYS } from './accountPurge';
import { Errors } from './errors';
import { prisma } from './prisma';
import { getSupabase } from './supabase';

/**
 * Auth plugin — decorates `request.userId` after verifying the bearer token.
 *
 * Two paths:
 *   1. Dev escape hatch (NODE_ENV !== 'production' AND token starts with "dev-"):
 *      `Authorization: Bearer dev-<userId>` — userId taken verbatim, no signature
 *      check. Lets the mobile app run end-to-end before OAuth ships.
 *   2. Real Supabase JWT (always available, including in dev): the token is
 *      verified via the Supabase Auth API; on first request the corresponding
 *      `users` + `linked_providers` rows are upserted from the JWT identities.
 *
 * Both paths reject a soft-deleted account (`users.deleted_at` set by
 * DELETE /users/me) with 401 `ACCOUNT_DELETED`. Without this the delete is
 * cosmetic: a live token keeps working and a fresh sign-in silently restores
 * the whole account.
 *
 * POST /users/me/restore is the one exception — it is how a user takes back a
 * deletion inside the grace window, so it has to be reachable by exactly the
 * accounts every other route turns away. It is still fully authenticated.
 */
const RESTORE_PATH = '/users/me/restore';

/** When the daily purge will erase an account soft-deleted at `deletedAt`. */
export function purgeDateFor(deletedAt: Date): Date {
  return new Date(deletedAt.getTime() + PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000);
}
async function authPlugin(app: FastifyInstance) {
  app.decorateRequest('userId', '');

  app.addHook('preHandler', async (req) => {
    if (req.url === '/health') return;
    if (req.url.startsWith('/shares/public/')) return;
    if (req.url.startsWith('/subscriptions/sync')) return; // RevenueCat webhook (own signature check)
    if (req.url.startsWith('/internal/')) {
      // Admin shared-secret check, separate from end-user auth.
      const token = extractBearer(req);
      if (!token || !checkAdminToken(token)) {
        throw Errors.unauthorized('Invalid admin token');
      }
      return;
    }

    const token = extractBearer(req);
    if (!token) throw Errors.unauthorized('Missing Authorization header');

    const restoring = req.url.split('?')[0] === RESTORE_PATH;

    if (process.env.NODE_ENV !== 'production' && token.startsWith('dev-')) {
      const userId = token.slice(4);
      const row = await prisma.user.findUnique({ where: { id: userId }, select: { deletedAt: true } });
      // A missing row still passes through: dev tokens are minted before the
      // user exists and the routes answer 404 on their own.
      if (row?.deletedAt && !restoring) throw Errors.accountDeleted(purgeDateFor(row.deletedAt));
      req.userId = userId;
      return;
    }

    req.userId = await verifySupabaseJwt(token, req, restoring);
  });
}

function checkAdminToken(candidate: string): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;     // never accept when unset — fail closed
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function verifySupabaseJwt(
  token: string,
  req: FastifyRequest,
  restoring: boolean,
): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser(token);
  if (error || !data.user) {
    req.log.info({ err: error }, 'Supabase JWT verification failed');
    throw Errors.unauthorized('Invalid or expired token');
  }
  // A soft-deleted account must not come back to life just because the provider
  // still authenticates it — signing in again would otherwise silently restore
  // every Story, Moment and Profile the delete sheet said was gone.
  const { deletedAt } = await ensureUser(data.user, req);
  if (deletedAt && !restoring) throw Errors.accountDeleted(purgeDateFor(deletedAt));
  return data.user.id;
}

interface SupabaseAuthUser {
  id:    string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  identities?: {
    provider:        string;
    identity_data?:  Record<string, unknown> | null;
  }[] | null;
}

async function ensureUser(
  user: SupabaseAuthUser,
  req: FastifyRequest,
): Promise<{ deletedAt: Date | null }> {
  const email = user.email ?? `${user.id}@no-email.local`; // Apple "Hide My Email" can return null
  const name  = pickName(user);
  const tz    = 'UTC'; // mobile can PATCH /users/me with the real tz once it has it

  // Upsert the User row. We rely on the JWT `sub` matching our users.id, which
  // is true for users we provision via Supabase Auth — Prisma id and Supabase
  // user.id share the same UUID space.
  const row = await prisma.user.upsert({
    where:  { id: user.id },
    update: {}, // don't overwrite user-edited name/timezone on every login
    create: { id: user.id, email, name, timezone: tz },
    select: { deletedAt: true },
  });
  // Deleted accounts are rejected by the caller — don't re-create their
  // subscription / provider rows on the way out.
  if (row.deletedAt) return row;

  // Every user needs a Subscription row — /subscriptions/me and four other
  // routes do `findUnique({ where: { userId } })` and treat a missing row as a
  // hard error. The seed user gets one from seed.ts; OAuth users are minted
  // here, so create their default (free / never_paid) row on first login.
  // All other columns fall back to their schema defaults.
  await prisma.subscription.upsert({
    where:  { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  // Sync linked_providers from the JWT identities (idempotent on (provider, providerUserId)).
  const identities = (user.identities ?? []).filter(
    (i): i is { provider: string; identity_data?: Record<string, unknown> | null } =>
      i.provider === 'apple' || i.provider === 'google',
  );
  for (const ident of identities) {
    const providerUserId = stringField(ident.identity_data, 'sub') ?? user.id;
    const providerEmail  = stringField(ident.identity_data, 'email');
    try {
      await prisma.linkedProvider.upsert({
        where:  { provider_providerUserId: { provider: ident.provider, providerUserId } },
        update: { providerEmail: providerEmail ?? null },
        create: {
          userId:         user.id,
          provider:       ident.provider,
          providerUserId,
          providerEmail:  providerEmail ?? null,
        },
      });
    } catch (err) {
      // Compound unique index name in older Prisma versions can vary; log and skip
      // rather than blocking the request — provider sync is best-effort.
      req.log.warn({ err, provider: ident.provider }, 'LinkedProvider upsert skipped');
    }
  }

  return row;
}

function pickName(user: SupabaseAuthUser): string {
  const meta = user.user_metadata ?? {};
  const full = stringField(meta, 'full_name') ?? stringField(meta, 'name');
  if (full && full.trim().length > 0) return full.slice(0, 100);
  if (user.email) return user.email.split('@')[0]!.slice(0, 100);
  return 'New User';
}

function stringField(obj: Record<string, unknown> | null | undefined, key: string): string | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === 'string' ? v : undefined;
}

function extractBearer(req: FastifyRequest): string | null {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

export default fp(authPlugin, { name: 'auth' });
