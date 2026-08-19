const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function run() {
  try {
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_code VARCHAR(100);');
    
    // Auto-populate project_code for existing rows if any are null
    const res = await pool.query('SELECT id, created_at FROM projects WHERE project_code IS NULL ORDER BY created_at ASC');
    for (let i = 0; i < res.rows.length; i++) {
      const row = res.rows[i];
      const seq = String(i + 1).padStart(3, '0');
      const year = new Date(row.created_at || Date.now()).getFullYear();
      const code = `PRJ-${year}-${seq}`;
      await pool.query('UPDATE projects SET project_code = $1 WHERE id = $2', [code, row.id]);
    }
    
    console.log('ALTER TABLE projects ADD COLUMN project_code SUCCESSFUL');
  } catch (err) {
    console.error('Error altering table:', err);
  } finally {
    await pool.end();
  }
}

run();
