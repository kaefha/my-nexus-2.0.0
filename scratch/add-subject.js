const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

const alterDb = async () => {
  const client = await pool.connect();
  try {
    console.log('Adding subject column to purchase_orders...');
    await client.query('ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS subject VARCHAR(255);');
    console.log('Success!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    pool.end();
  }
};

alterDb();
