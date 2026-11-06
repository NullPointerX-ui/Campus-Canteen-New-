// PostgreSQL connection pool. The address comes from the .env.local file (never hard-coded).
import pg from 'pg';

const g = globalThis;

export const pool =
  g._pgPool ||
  new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 5,
  });

if (process.env.NODE_ENV !== 'production') g._pgPool = pool;

export const query = (text, params) => pool.query(text, params);
