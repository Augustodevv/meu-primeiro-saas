import { Pool } from 'pg';

if (!process.env.DATABASE_URL) throw new Error('Defina DATABASE_URL para conectar ao PostgreSQL.');

export const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
