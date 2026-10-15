import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TransactionRepository } from './transaction.repository.js';
import { enforceTransactionLimit } from './subscription.middleware.js';

const inputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  amount: z.number().positive().finite().max(999999999999.99).refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, 'Use no máximo duas casas decimais.'),
  transactionDate: z.string().date(),
  type: z.enum(['INCOME', 'EXPENSE']),
});
const idSchema = z.object({ id: z.string().uuid() });
const repo = new TransactionRepository();

export async function transactionRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);

  app.get('/', async (request) => {
    const { month } = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional() }).parse(request.query);
    return repo.list(request.user.tenantId, month);
  });

  app.post('/', { preHandler: enforceTransactionLimit }, async (request, reply) => {
    const input = inputSchema.parse(request.body);
    const transaction = await repo.create(request.user.tenantId, request.user.userId, input);
    return reply.code(201).send(transaction);
  });

  app.put('/:id', async (request, reply) => {
    const { id } = idSchema.parse(request.params);
    const transaction = await repo.update(id, request.user.tenantId, inputSchema.parse(request.body));
    return transaction ? reply.send(transaction) : reply.code(404).send({ message: 'Transação não encontrada.' });
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = idSchema.parse(request.params);
    return (await repo.delete(id, request.user.tenantId)) ? reply.code(204).send() : reply.code(404).send({ message: 'Transação não encontrada.' });
  });
}
