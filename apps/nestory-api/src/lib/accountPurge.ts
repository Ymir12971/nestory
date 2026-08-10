import { audit } from './audit';
import { prisma } from './prisma';
import { getSupabase, removeStorageObjects, type StorageBucket } from './supabase';

/**
 * Account purge — the second half of "delete my account".
 *
 * DELETE /users/me only stamps `users.deleted_at`; the auth plugin locks the
 * account out immediately, but the rows and photos stay put for a recovery
 * window. This job is what actually makes the deletion permanent, and what the
 * delete sheet's "permanently deleted 30 days later" copy promises.
 *
 * Runs daily off the BullMQ scheduler (see storyQueue.ts). Everything a user
 * owns hangs off `users.id` with `onDelete: Cascade`, so one row delete clears
 * children / moments / files / stories / shares / tokens / subscription. Two
 * things are NOT covered by the cascade and are handled here explicitly:
 *
 *   1. Supabase Storage objects — every upload lands at `<userId>/<uuid>.<ext>`
 *      (see routes/uploads.ts), so the user id is a clean prefix to sweep.
 *   2. The Supabase Auth user, which lives outside our database.
 *
 * Audit rows survive on purpose (`onDelete: SetNull`) — they're the record that
 * the deletion happened. We write with `userId: null` so the row doesn't depend
 * on the user we're about to remove.
 */
export const PURGE_AFTER_DAYS = 30;

/** Buckets that hold per-user uploads. `stories` has no writer yet. */
const USER_BUCKETS: StorageBucket[] = ['memories', 'avatars'];

/** Supabase caps `list` at 100 by default; page explicitly. */
const LIST_PAGE = 1000;

type Log = (msg: string, data?: unknown) => void;

export async function purgeDeletedAccounts(log: Log): Promise<{ purged: number; failed: number }> {
  const cutoff = new Date(Date.now() - PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000);

  const due = await prisma.user.findMany({
    where:  { deletedAt: { not: null, lte: cutoff } },
    select: { id: true, deletedAt: true },
    take:   200, // a runaway backlog spreads over several nights rather than one long job
  });
  if (due.length === 0) {
    log('[account-purge] nothing due');
    return { purged: 0, failed: 0 };
  }

  let purged = 0;
  let failed = 0;
  for (const user of due) {
    try {
      const objects = await purgeStorage(user.id, log);
      // The cascade does the rest of the database in one statement.
      await prisma.user.delete({ where: { id: user.id } });
      await purgeAuthUser(user.id, log);

      audit({
        userId:     null, // the user row is gone; keep the id in resourceId
        actorType:  'system',
        action:     'purge_account',
        resource:   'user',
        resourceId: user.id,
        metadata:   { deletedAt: user.deletedAt?.toISOString(), storageObjects: objects },
      });
      purged += 1;
      log(`[account-purge] purged ${user.id} (${objects} storage objects)`);
    } catch (err) {
      // One bad account must not stop the rest — it'll be retried tomorrow.
      failed += 1;
      log(`[account-purge] FAILED ${user.id}: ${(err as Error).message}`);
    }
  }

  log(`[account-purge] done — purged=${purged} failed=${failed}`);
  return { purged, failed };
}

/** Deletes every object under the `<userId>/` prefix. Returns the count. */
async function purgeStorage(userId: string, log: Log): Promise<number> {
  const storage = getSupabase().storage;
  let removed = 0;

  for (const bucket of USER_BUCKETS) {
    const paths: string[] = [];
    for (let offset = 0; ; offset += LIST_PAGE) {
      const { data, error } = await storage
        .from(bucket)
        .list(userId, { limit: LIST_PAGE, offset });
      if (error) throw new Error(`list ${bucket}/${userId} failed: ${error.message}`);
      if (!data || data.length === 0) break;
      paths.push(...data.map((f) => `${userId}/${f.name}`));
      if (data.length < LIST_PAGE) break;
    }

    removed += await removeStorageObjects(bucket, paths);
    if (paths.length > 0) log(`[account-purge] ${bucket}: removed ${paths.length}`);
  }

  return removed;
}

/**
 * Best-effort: the database rows are already gone, so a failure here leaves an
 * orphaned Auth user rather than recoverable data. Dev-auth accounts have no
 * Supabase Auth record at all, which surfaces as a benign "not found".
 */
async function purgeAuthUser(userId: string, log: Log): Promise<void> {
  const { error } = await getSupabase().auth.admin.deleteUser(userId);
  if (error) log(`[account-purge] auth user ${userId} not removed: ${error.message}`);
}
