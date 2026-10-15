import { FastifyInstance } from 'fastify';
import { db } from '../../lib/database.js';
import { z } from 'zod';

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);
  app.get('/summary', async (request) => {
    const { month } = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }).parse(request.query);
    const result = await db.query<{ balance: number; income: number; expense: number }>(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END), 0)::float8 AS balance,
        COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME' AND transaction_date >= ($2 || '-01')::date AND transaction_date < (($2 || '-01')::date + INTERVAL '1 month')), 0)::float8 AS income,
        COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE' AND transaction_date >= ($2 || '-01')::date AND transaction_date < (($2 || '-01')::date + INTERVAL '1 month')), 0)::float8 AS expense
       FROM transactions WHERE tenant_id = $1`, [request.user.tenantId, month],
    );
    return result.rows[0];
  });
}
