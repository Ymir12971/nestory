import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FEEDBACK_CONSTRAINTS } from '@nestory/types';
import { prisma } from '../lib/prisma';
import { sendMail } from '../lib/mailer';
import { parseBody } from '../lib/validation';

// Redesign (ST-feedback): text OR photos — either alone is a valid submission.
const feedbackBody = z.object({
  text:      z.string().max(2000).optional(),
  email:     z.string().email().max(255).optional(),
  photoUrls: z.array(z.string().url().max(500)).max(FEEDBACK_CONSTRAINTS.maxPhotos).optional(),
}).refine(
  b => (b.text?.trim().length ?? 0) > 0 || (b.photoUrls?.length ?? 0) > 0,
  { message: 'Feedback needs text or at least one photo' },
);

/** Subject line preview — one line, trimmed, never empty. */
function summarize(text: string | undefined): string {
  const line = (text ?? '').trim().split('\n')[0] ?? '';
  if (!line) return 'photos only';
  return line.length > 60 ? `${line.slice(0, 60)}…` : line;
}

function renderFeedbackMail(
  id: string,
  userId: string,
  body: { text?: string; email?: string; photoUrls?: string[] },
): string {
  return [
    body.text?.trim() || '(no text — photos only)',
    '',
    '—',
    `From:     ${body.email ?? '(no contact email given)'}`,
    `User ID:  ${userId}`,
    `Feedback: ${id}`,
    ...(body.photoUrls?.length
      ? ['', `Photos (${body.photoUrls.length}):`, ...body.photoUrls.map((u) => `  ${u}`)]
      : []),
  ].join('\n');
}

/**
 * Feedback inbox. Rows land in `feedback` — read them in Supabase Studio:
 *
 *   select created_at, email, text, photo_urls from feedback order by created_at desc;
 *
 * Until 2026-09-04 this only wrote a pino line, so a submission lived exactly
 * as long as Railway's log retention and nothing ever reached us. The row is
 * now the record; the log line stays because it's how the request shows up in
 * the stream, and a notification goes to FEEDBACK_NOTIFY_TO on top.
 *
 * The mail is deliberately secondary: the row is committed first, and the send
 * is fire-and-forget. Mail being down must never turn a submission the user
 * already completed into an error, and nothing is lost if it fails — the row
 * is still there.
 */

export async function feedbackRoutes(app: FastifyInstance) {
  app.post('/', async (req, reply) => {
    const body = parseBody(feedbackBody, req);

    const row = await prisma.feedback.create({
      data: {
        userId:    req.userId,
        email:     body.email ?? null,
        text:      body.text ?? null,
        photoUrls: body.photoUrls ?? [],
      },
      select: { id: true },
    });

    req.log.info(
      { feedbackId: row.id, userId: req.userId, email: body.email, text: body.text, photoUrls: body.photoUrls },
      'user_feedback_submitted',
    );

    const notifyTo = process.env.FEEDBACK_NOTIFY_TO;
    if (notifyTo) {
      void sendMail({
        to:      notifyTo,
        subject: `Nestory feedback — ${summarize(body.text)}`,
        text:    renderFeedbackMail(row.id, req.userId, body),
        // Replying to the notification writes straight back to the user.
        ...(body.email ? { replyTo: body.email } : {}),
      }).then((result) => {
        if (result.ok) {
          req.log.info({ feedbackId: row.id, mailId: result.id }, 'feedback_notification_sent');
        } else if (result.reason !== 'not_configured') {
          req.log.error(
            { feedbackId: row.id, reason: result.reason, detail: result.detail },
            'feedback_notification_failed',
          );
        }
      });
    }

    reply.code(201);
    return { data: { received: true } };
  });
}
