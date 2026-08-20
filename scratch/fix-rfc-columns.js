require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`ALTER TABLE rfcs ADD COLUMN IF NOT EXISTS request_date TIMESTAMP`);
    await client.query(`ALTER TABLE rfcs ADD COLUMN IF NOT EXISTS site_approver_id UUID`);
    await client.query(`ALTER TABLE rfcs ADD COLUMN IF NOT EXISTS finance_approver_id UUID`);
    console.log("Success: Added missing columns to rfcs table");
  } catch (e) {
    console.error("Error:", e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
