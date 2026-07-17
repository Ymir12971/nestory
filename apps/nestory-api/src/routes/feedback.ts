import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FEEDBACK_CONSTRAINTS } from '@nestory/types';
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

/**
 * Feedback inbox. For now we structurally log entries via pino — durable on
 * Railway's stream and easy to grep ("user_feedback_submitted"). When demand
 * grows, swap the log call for a `prisma.feedback.create` once a table exists.
 */
export async function feedbackRoutes(app: FastifyInstance) {
  app.post('/', async (req, reply) => {
    const body = parseBody(feedbackBody, req);
    req.log.info(
      { userId: req.userId, email: body.email, text: body.text, photoUrls: body.photoUrls },
      'user_feedback_submitted',
    );
    reply.code(201);
    return { data: { received: true } };
  });
}
