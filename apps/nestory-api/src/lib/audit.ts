import type { FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Audit-log writer — fire-and-forget, never throws.
 *
 * Call sites should use this for events that have legal, billing, or
 * security relevance: account deletion, subscription changes, upload
 * activity, sign-in. The semantics on failure are deliberately lenient:
 * a flaky DB write here must NOT fail the actual request the caller is
 * processing.
 *
 * `actorType` derives from caller intent:
 *   - 'user'    — request originated from an authenticated user
 *   - 'webhook' — incoming third-party webhook (RevenueCat, Apple S2S)
 *   - 'system'  — internal job (worker, cron, dispatcher)
 */
export type AuditActorType = 'user' | 'webhook' | 'system';

export interface AuditEvent {
  userId?:    string | null;
  actorType:  AuditActorType;
  action:     string;            // 'login' | 'delete_account' | 'upload_signed' | 'subscription_change' | …
  resource?:  string;            // e.g. 'user', 'asset', 'subscription'
  resourceId?: string;           // free-form id of the resource (UUID, RC eventId, …)
  metadata?:  Record<string, unknown>;
  req?:       FastifyRequest;    // for ipAddr + userAgent extraction
}

export function audit(event: AuditEvent): void {
  void writeAudit(event).catch((err) => {
    // Never propagate. We log but don't disturb the request flow.
    if (event.req?.log) {
      event.req.log.warn({ err, action: event.action }, 'audit write failed');
    } else {
      console.warn('[audit] write failed', err);
    }
  });
}

async function writeAudit(event: AuditEvent): Promise<void> {
  // Schema column widths: actor_type 20, action 50, resource 50, resource_id 64.
  // Truncate defensively — caller-supplied resourceIds (e.g. Storage paths
  // shaped like `<userId>/<uuid>.<ext>`) can run >64 chars.
  await prisma.auditLog.create({
    data: {
      userId:     event.userId ?? null,
      actorType:  event.actorType,
      action:     event.action.slice(0, 50),
      resource:   event.resource?.slice(0, 50) ?? null,
      resourceId: event.resourceId?.slice(0, 64) ?? null,
      ipAddr:     event.req ? extractIp(event.req) : null,
      userAgent:  event.req?.headers['user-agent'] ?? null,
      ...(event.metadata ? { metadata: event.metadata as Prisma.InputJsonValue } : {}),
    },
  });
}

function extractIp(req: FastifyRequest): string | null {
  // Trust X-Forwarded-For when running behind a proxy (Railway, Cloudflare).
  // Fastify's req.ip already does this when trustProxy is enabled, but in dev
  // we run without a proxy so fall back to the socket address.
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string') {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.ip ?? null;
}
