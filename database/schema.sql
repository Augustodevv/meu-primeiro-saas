-- PostgreSQL 15+
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE subscription_plan AS ENUM ('FREE', 'PREMIUM');
CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email),
  UNIQUE (tenant_id, id)
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'FREE',
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title VARCHAR(160) NOT NULL CHECK (length(trim(title)) > 0),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  transaction_date DATE NOT NULL,
  type transaction_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users(tenant_id, id) ON DELETE RESTRICT
);

-- Todo acesso financeiro é escopado ao inquilino.
CREATE INDEX transactions_tenant_date_idx ON transactions (tenant_id, transaction_date DESC);
CREATE INDEX transactions_tenant_type_idx ON transactions (tenant_id, type);
