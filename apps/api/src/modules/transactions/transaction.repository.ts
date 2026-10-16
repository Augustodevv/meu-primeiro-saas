import { db } from '../../lib/database.js';

export type TransactionType = 'INCOME' | 'EXPENSE';
export interface TransactionInput { title: string; amount: number; transactionDate: string; type: TransactionType }
export const FREE_TRANSACTION_LIMIT = 50;

export class TransactionLimitError extends Error {
  constructor() { super(`O plano Free permite até ${FREE_TRANSACTION_LIMIT} transações. Edite ou remova um registro para liberar espaço. O Premium é apenas demonstrativo.`); }
}

export class TransactionRepository {
  async countByTenant(tenantId: string): Promise<number> {
    const result = await db.query<{ count: string }>('SELECT count(*) FROM transactions WHERE tenant_id = $1', [tenantId]);
    return Number(result.rows[0].count);
  }

  async list(tenantId: string, month?: string) {
    const values: string[] = [tenantId];
    const filter = month ? " AND transaction_date >= ($2 || '-01')::date AND transaction_date < (($2 || '-01')::date + INTERVAL '1 month')" : '';
    if (month) values.push(month);
    const result = await db.query(
      `SELECT id, title, amount::float8 AS amount, transaction_date AS "transactionDate", type
       FROM transactions WHERE tenant_id = $1${filter} ORDER BY transaction_date DESC, created_at DESC`, values,
    );
    return result.rows;
  }

  async findById(id: string, tenantId: string) {
    const result = await db.query('SELECT id FROM transactions WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    return result.rows[0] ?? null;
  }

  async create(tenantId: string, userId: string, input: TransactionInput) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      // Serializa criações do mesmo tenant: dois requests não podem ultrapassar o limite juntos.
      const tenant = await client.query('SELECT id FROM tenants WHERE id = $1 FOR UPDATE', [tenantId]);
      if (!tenant.rows[0]) throw new Error('Organização não encontrada.');
      const subscription = await client.query<{ plan: 'FREE' | 'PREMIUM' }>(
        `SELECT plan FROM subscriptions WHERE tenant_id = $1 AND active = true
         AND (expires_at IS NULL OR expires_at > now())`, [tenantId],
      );
      if (subscription.rows[0]?.plan !== 'PREMIUM') {
        const count = await client.query<{ count: string }>('SELECT count(*) FROM transactions WHERE tenant_id = $1', [tenantId]);
        if (Number(count.rows[0].count) >= FREE_TRANSACTION_LIMIT) throw new TransactionLimitError();
      }
      const result = await client.query(
        `INSERT INTO transactions (tenant_id, user_id, title, amount, transaction_date, type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, title, amount::float8 AS amount, transaction_date AS "transactionDate", type`,
        [tenantId, userId, input.title.trim(), input.amount, input.transactionDate, input.type],
      );
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async update(id: string, tenantId: string, input: TransactionInput) {
    const result = await db.query(
      `UPDATE transactions SET title = $3, amount = $4, transaction_date = $5, type = $6, updated_at = now()
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, title, amount::float8 AS amount, transaction_date AS "transactionDate", type`,
      [id, tenantId, input.title.trim(), input.amount, input.transactionDate, input.type],
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string, tenantId: string) {
    const result = await db.query('DELETE FROM transactions WHERE id = $1 AND tenant_id = $2 RETURNING id', [id, tenantId]);
    return Boolean(result.rows[0]);
  }
}