import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const globalForPg = global as unknown as { pool: Pool };

export const pool =
  globalForPg.pool ||
  new Pool({
    connectionString: process.env.DATABASE_URL?.replace(/"/g, ''), // Strip quotes just in case
    ssl: process.env.DATABASE_URL?.includes('supabase') || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== 'production') globalForPg.pool = pool;

// A generic query helper function
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
};

// Keep generateId for backwards compatibility and easy uuid generation
export const generateId = () => {
  return uuidv4();
};
