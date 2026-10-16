import { FastifyReply, FastifyRequest } from 'fastify';
import { db } from '../../lib/database.js';
import { FREE_TRANSACTION_LIMIT, TransactionRepository } from './transaction.repository.js';

const repository = new TransactionRepository();

/** Bloqueia somente novas transações. Alterar/remover continua permitido. */
export async function enforceTransactionLimit(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId } = request.user;
  const subscription = await db.query<{ plan: 'FREE' | 'PREMIUM' }>(
    `SELECT plan FROM subscriptions
     WHERE tenant_id = $1 AND active = true AND (expires_at IS NULL OR expires_at > now())`, [tenantId],
  );
  const plan = subscription.rows[0]?.plan ?? 'FREE';
  if (plan === 'PREMIUM') return;

  const count = await repository.countByTenant(tenantId);
  if (count >= FREE_TRANSACTION_LIMIT) {
    return reply.code(403).send({
      code: 'FREE_TRANSACTION_LIMIT_REACHED',
      message: `O plano Free permite até ${FREE_TRANSACTION_LIMIT} transações. Edite ou remova um registro para liberar espaço. O Premium é apenas demonstrativo.`,
      limit: FREE_TRANSACTION_LIMIT,
    });
  }
}