import bcrypt from 'bcrypt';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../lib/database.js';

const credentials = z.object({ email: z.string().email().max(255), password: z.string().min(8).max(72).refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Senha deve ter no máximo 72 bytes.'), tenantSlug: z.string().regex(/^[a-z0-9-]+$/).max(80) });
const registration = credentials.extend({ name: z.string().trim().min(2).max(120), tenantName: z.string().trim().min(2).max(120) });

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const input = registration.parse(request.body);
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const tenant = await client.query<{ id: string }>('INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id', [input.tenantName, input.tenantSlug]);
      const passwordHash = await bcrypt.hash(input.password, 12);
      const user = await client.query<{ id: string; email: string; name: string }>(
        'INSERT INTO users (tenant_id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, email, name',
        [tenant.rows[0].id, input.name, input.email.toLowerCase(), passwordHash],
      );
      await client.query('INSERT INTO subscriptions (tenant_id, plan) VALUES ($1, $2)', [tenant.rows[0].id, 'FREE']);
      await client.query('COMMIT');
      const payload = { userId: user.rows[0].id, tenantId: tenant.rows[0].id, email: user.rows[0].email, name: user.rows[0].name };
      return reply.code(201).send({ token: app.jwt.sign(payload), user: payload });
    } catch (error) {
      await client.query('ROLLBACK');
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        return reply.code(409).send({ message: 'Este identificador de organização já está em uso.' });
      }
      throw error;
    } finally { client.release(); }
  });

  app.post('/login', async (request, reply) => {
    const input = credentials.parse(request.body);
    const result = await db.query<{ id: string; tenant_id: string; email: string; name: string; password_hash: string }>(
      `SELECT u.id, u.tenant_id, u.email, u.name, u.password_hash FROM users u
       JOIN tenants t ON t.id = u.tenant_id WHERE u.email = $1 AND t.slug = $2 LIMIT 1`, [input.email.toLowerCase(), input.tenantSlug],
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(input.password, user.password_hash))) {
      return reply.code(401).send({ message: 'E-mail ou senha inválidos.' });
    }
    const payload = { userId: user.id, tenantId: user.tenant_id, email: user.email, name: user.name };
    return { token: app.jwt.sign(payload), user: payload };
  });
}