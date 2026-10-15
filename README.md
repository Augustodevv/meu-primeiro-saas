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

1. Crie um banco PostgreSQL e execute `database/schema.sql`.
2. Copie `apps/api/.env.example` para `apps/api/.env` e ajuste os valores.
3. Instale dependências: `npm install`.
4. Inicie a API: `npm run dev:api`.
5. Em outro terminal, inicie o frontend: `npm run dev:web`.

O `POST /auth/register` cria uma organização (tenant) e um usuário administrador no plano Free. Registro e login exigem `tenantSlug` (ex.: `minha-familia`) para impedir ambiguidade quando o mesmo e-mail pertence a mais de uma organização.

### Rotas principais

- `POST /auth/register`, `POST /auth/login`
- `GET /dashboard/summary`
- `GET /transactions?month=2026-10`
- `POST /transactions`, `PUT /transactions/:id`, `DELETE /transactions/:id`

As rotas autenticadas exigem `Authorization: Bearer <token>`. O identificador do tenant é sempre extraído do JWT — nunca do corpo da requisição.
