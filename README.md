# Finanças SaaS — MVP

Monorepo inicial para gestão financeira pessoal multi-tenant, com API Fastify, PostgreSQL e dashboard React.

## Estrutura

```text
.
├── apps/
│   ├── api/                 # API Fastify + regras de domínio
│   └── web/                 # React + TypeScript + Tailwind
├── database/
│   └── schema.sql           # Schema PostgreSQL
└── package.json             # Workspaces npm
```

## Execução

1. Execute `docker compose up -d db` para iniciar o PostgreSQL local e aplicar `database/schema.sql` automaticamente. Se usar um PostgreSQL próprio, crie o banco e aplique o script manualmente.
2. Copie `apps/api/.env.example` para `apps/api/.env` e ajuste os valores. Use um `JWT_SECRET` longo e exclusivo fora do ambiente local.
3. Instale dependências: `npm install`.
4. Inicie a API: `npm run dev:api`.
5. Em outro terminal, inicie o frontend: `npm run dev:web` e abra `http://localhost:5173`.

O `POST /auth/register` cria uma organização (tenant) e um usuário administrador no plano Free. Registro e login exigem `tenantSlug` (ex.: `minha-familia`) para impedir ambiguidade quando o mesmo e-mail pertence a mais de uma organização.

## Hospedagem

`vercel.json` reúne o frontend Vite e a API Fastify em um projeto Vercel Services (beta). O frontend usa `/api` no mesmo domínio, enquanto o roteamento do serviço remove esse prefixo antes de chegar ao Fastify. Configure `DATABASE_URL` (PostgreSQL) e `JWT_SECRET` (ao menos 32 caracteres) no projeto. Aplique `database/schema.sql` uma vez em um banco vazio antes de usar registro/login. `GET /api/health` confirma a conexão com o banco. O plano Free/Premium continua simulado, sem cobrança real.

### Rotas principais

- `POST /auth/register`, `POST /auth/login`
- `GET /dashboard/summary?month=2026-10`
- `GET /transactions?month=2026-10`
- `POST /transactions`, `PUT /transactions/:id`, `DELETE /transactions/:id`
- `GET /subscription`

As rotas autenticadas exigem `Authorization: Bearer <token>`. O identificador do tenant é sempre extraído do JWT — nunca do corpo da requisição.

## Escopo do MVP

O plano Free permite até 50 transações por organização; o Premium simulado permite mais. O limite é conferido novamente dentro de uma transação do banco para impedir que requisições simultâneas o ultrapassem. Não há integração de pagamento neste MVP.
