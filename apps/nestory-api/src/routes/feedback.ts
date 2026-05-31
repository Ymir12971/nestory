import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parseBody } from '../lib/validation';

const feedbackBody = z.object({
  text:  z.string().min(1).max(2000),
  email: z.string().email().max(255).optional(),
});

/**
 * Feedback inbox. For now we structurally log entries via pino — durable on
 * Railway's stream and easy to grep ("user_feedback_submitted"). When demand
 * grows, swap the log call for a `prisma.feedback.create` once a table exists.
 */
export async function feedbackRoutes(app: FastifyInstance) {
  app.post('/', async (req, reply) => {
    const body = parseBody(feedbackBody, req);
    req.log.info(
      { userId: req.userId, email: body.email, text: body.text },
      'user_feedback_submitted',
    );
    reply.code(201);
    return { data: { received: true } };
  });
}
