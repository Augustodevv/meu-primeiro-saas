import 'dotenv/config';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { db } from './lib/database.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { transactionRoutes } from './modules/transactions/transaction.routes.js';
import { TransactionLimitError } from './modules/transactions/transaction.repository.js';
import { subscriptionRoutes } from './modules/subscription/subscription.routes.js';

const app = Fastify({ logger: true });
await app.register(cors, { origin: process.env.WEB_ORIGIN?.split(',') ?? ['http://localhost:5173', 'http://127.0.0.1:5173'] });
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Defina JWT_SECRET com pelo menos 32 caracteres.');
await app.register(jwt, { secret: process.env.JWT_SECRET });

app.decorate('authenticate', async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
  try { await request.jwtVerify(); } catch { return reply.code(401).send({ message: 'Token ausente, inválido ou expirado.' }); }
});
app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) return reply.code(400).send({ message: 'Dados inválidos.', issues: error.flatten() });
  if (error instanceof TransactionLimitError) return reply.code(403).send({ code: 'FREE_TRANSACTION_LIMIT_REACHED', message: error.message, limit: 50 });
  app.log.error(error);
  return reply.code(500).send({ message: 'Erro interno do servidor.' });
});

await app.register(authRoutes, { prefix: '/auth' });
await app.register(dashboardRoutes, { prefix: '/dashboard' });
await app.register(transactionRoutes, { prefix: '/transactions' });
await app.register(subscriptionRoutes, { prefix: '/subscription' });
app.get('/health', async () => {
  await db.query('SELECT 1');
  return { status: 'ok' };
});

await app.listen({ port: Number(process.env.PORT ?? 3333), host: '0.0.0.0' });
