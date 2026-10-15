import 'dotenv/config';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { authRoutes } from './modules/auth/auth.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { transactionRoutes } from './modules/transactions/transaction.routes.js';

const app = Fastify({ logger: true });
await app.register(cors, { origin: process.env.WEB_ORIGIN ?? true });
await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'development-secret-change-me' });

app.decorate('authenticate', async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
  try { await request.jwtVerify(); } catch { return reply.code(401).send({ message: 'Token ausente, inválido ou expirado.' }); }
});
app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) return reply.code(400).send({ message: 'Dados inválidos.', issues: error.flatten() });
  app.log.error(error);
  return reply.code(500).send({ message: 'Erro interno do servidor.' });
});

await app.register(authRoutes, { prefix: '/auth' });
await app.register(dashboardRoutes, { prefix: '/dashboard' });
await app.register(transactionRoutes, { prefix: '/transactions' });
app.get('/health', async () => ({ status: 'ok' }));

await app.listen({ port: Number(process.env.PORT ?? 3333), host: '0.0.0.0' });
