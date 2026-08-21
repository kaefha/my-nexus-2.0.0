const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

// We need to fetch the actual POSTGRES_URL since DATABASE_URL uses pooler usually, which is fine.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace(/"/g, ''),
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log("Checking columns in delivery_orders...");
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'delivery_orders'
    `);
    const columns = res.rows.map(r => r.column_name);
    console.log("Existing columns:", columns);
    
    if (!columns.includes('po_id')) {
      console.log("Adding po_id column...");
      await pool.query('ALTER TABLE delivery_orders ADD COLUMN po_id UUID');
    }
    if (!columns.includes('origin_lat')) {
      console.log("Adding origin_lat column...");
      await pool.query('ALTER TABLE delivery_orders ADD COLUMN origin_lat NUMERIC(10, 8)');
    }
    if (!columns.includes('origin_lng')) {
      console.log("Adding origin_lng column...");
      await pool.query('ALTER TABLE delivery_orders ADD COLUMN origin_lng NUMERIC(11, 8)');
    }
    
    // Also check if delivery_orders in init-db scripts needs updating
    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    pool.end();
  }
}

migrate();
