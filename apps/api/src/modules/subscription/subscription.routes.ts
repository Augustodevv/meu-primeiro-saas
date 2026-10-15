import { FastifyInstance } from 'fastify';
import { db } from '../../lib/database.js';
import { FREE_TRANSACTION_LIMIT, TransactionRepository } from '../transactions/transaction.repository.js';

const transactions = new TransactionRepository();

export async function subscriptionRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);
  app.get('/', async (request) => {
    const { tenantId } = request.user;
    const [result, transactionCount] = await Promise.all([
      db.query<{ plan: 'FREE' | 'PREMIUM' }>(
        `SELECT plan FROM subscriptions WHERE tenant_id = $1 AND active = true
         AND (expires_at IS NULL OR expires_at > now())`, [tenantId],
      ),
      transactions.countByTenant(tenantId),
    ]);
    const plan = result.rows[0]?.plan ?? 'FREE';
    return { plan, transactionCount, limit: plan === 'FREE' ? FREE_TRANSACTION_LIMIT : null };
  });
}
