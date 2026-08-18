import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { pool } = await import('../src/lib/db');
  try {
    // Inventory Transactions
    await pool.query(`ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS do_number VARCHAR(100);`);
    await pool.query(`ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS evidence_photo_url TEXT;`);
    
    // RFCs
    await pool.query(`ALTER TABLE rfcs ADD COLUMN IF NOT EXISTS site_approver_id UUID REFERENCES users(id);`);
    await pool.query(`ALTER TABLE rfcs ADD COLUMN IF NOT EXISTS finance_approver_id UUID REFERENCES users(id);`);

    // Delivery Orders
    await pool.query(`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS po_id UUID REFERENCES purchase_orders(id);`);

    // Users
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT '123';`);
    
    console.log("Schema changes applied successfully");
  } catch (error) {
    console.error("Error altering tables:", error);
  } finally {
    process.exit(0);
  }
}

main();
