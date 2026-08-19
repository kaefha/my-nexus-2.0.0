const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function run() {
  try {
    await pool.query('ALTER TABLE material_masters ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15,2) DEFAULT 0;');
    console.log('ALTER TABLE material_masters ADD COLUMN unit_price NUMERIC(15,2) DEFAULT 0 SUCCESSFUL');
  } catch (err) {
    console.error('Error altering table:', err);
  } finally {
    await pool.end();
  }
}

run();
