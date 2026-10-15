import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string; tenantId: string; email: string };
    user: { userId: string; tenantId: string; email: string };
  }
}
