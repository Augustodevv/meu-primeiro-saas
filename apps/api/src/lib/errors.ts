import { FastifyReply } from 'fastify';

export function sendDatabaseError(error: unknown, reply: FastifyReply) {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
    return reply.code(409).send({ message: 'Este registro já existe.' });
  }
  throw error;
}
