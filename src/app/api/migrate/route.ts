import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check and add po_id
    const colCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'delivery_orders'
    `);
    const cols = colCheck.rows.map(r => r.column_name);

    if (!cols.includes('po_id')) {
      await client.query('ALTER TABLE delivery_orders ADD COLUMN po_id UUID');
    }
    if (!cols.includes('origin_lat')) {
      await client.query('ALTER TABLE delivery_orders ADD COLUMN origin_lat NUMERIC(10, 8)');
    }
    if (!cols.includes('origin_lng')) {
      await client.query('ALTER TABLE delivery_orders ADD COLUMN origin_lng NUMERIC(11, 8)');
    }
    if (!cols.includes('evidence')) {
      await client.query('ALTER TABLE delivery_orders ADD COLUMN evidence TEXT');
    }

    await client.query('COMMIT');
    return NextResponse.json({ message: 'Migration successful!' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
