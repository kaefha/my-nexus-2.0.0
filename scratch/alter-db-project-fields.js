const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function run() {
  try {
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(100);');
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type VARCHAR(100);');
    console.log('ALTER TABLE projects ADD COLUMN whatsapp_number and project_type SUCCESSFUL');
  } catch (err) {
    console.error('Error altering table:', err);
  } finally {
    await pool.end();
  }
}

run();
