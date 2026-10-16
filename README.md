# Finanças SaaS — MVP

Aplicação Full-Stack de gestão financeira pessoal com organizações independentes, autenticação e um dashboard para acompanhar receitas e despesas.

## Problema

Planilhas pessoais funcionam no início, mas dificultam separar usuários, limitar acesso e manter uma visão rápida do mês. Este projeto explora como transformar esse fluxo em um produto web multi-tenant, mantendo os dados de cada organização isolados.

## Funcionalidades

- Cadastro de organização e usuário administrador.
- Login com JWT e rotas autenticadas.
- Dashboard mensal com receitas, despesas e saldo.
- Cadastro, edição, exclusão e filtro de transações.
- Isolamento de dados por organização.
- Plano Free com limite de 50 transações e Premium simulado.
- Modo de demonstração local, sem cadastro ou banco de dados.
- Validação automatizada de build e integração no GitHub Actions.

## Tecnologias

**Frontend:** React, TypeScript, Vite e Tailwind CSS  
**Backend:** Node.js e Fastify  
**Dados:** PostgreSQL, SQL e consultas parametrizadas  
**Qualidade:** Node Test Runner, testes de integração e GitHub Actions

## Estrutura

```text
.
├── apps/
│   ├── api/       # API Fastify e regras de domínio
│   └── web/       # React, TypeScript e Tailwind CSS
├── database/
│   └── schema.sql
└── tests/
    └── integration.test.mjs
```

## Como executar

Requisitos: Node.js 24+, npm, Docker e Docker Compose.

```bash
docker compose up -d db
npm install
```

Copie `apps/api/.env.example` para `apps/api/.env`, defina `DATABASE_URL` e um `JWT_SECRET` com pelo menos 32 caracteres. Depois, execute em terminais separados:

```bash
npm run dev:api
npm run dev:web
```

O frontend estará disponível em `http://localhost:5173`.

## Validação

```bash
npm run build
node --test tests/integration.test.mjs
```

Os testes de integração exigem um PostgreSQL de teste com `database/schema.sql` aplicado. O workflow `.github/workflows/verify.yml` executa build e integração com PostgreSQL 16.

## Estado do projeto

MVP de estudo e portfólio. O sistema não processa pagamentos reais, não integra contas bancárias e não deve receber dados financeiros reais em uma demonstração pública. O Premium representa apenas uma regra simulada do servidor.

O projeto foi desenvolvido com apoio de IA, mantendo no repositório decisões, limites e verificações técnicas de forma transparente.


