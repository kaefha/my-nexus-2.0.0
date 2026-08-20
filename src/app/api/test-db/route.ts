import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  try {
    const results: Record<string, string> = {};
    
    const queries = [
      { name: 'materials', sql: `SELECT COUNT(*) FROM material_masters WHERE is_active = true` },
      { name: 'projects', sql: `SELECT COUNT(*) FROM projects WHERE status = 'ACTIVE'` },
      { name: 'rfcs', sql: `SELECT COUNT(*) FROM rfcs WHERE status IN ('WAITING_SITE_APPROVAL', 'WAITING_FINANCE_APPROVAL', 'SUBMITTED')` },
      { name: 'pos', sql: `SELECT COUNT(*) FROM purchase_orders WHERE status = 'ACTIVE'` },
      { name: 'dos', sql: `SELECT COUNT(*) FROM delivery_orders WHERE status = 'SHIPPED'` },
      { name: 'transfers', sql: `SELECT COUNT(*) FROM transfers WHERE status = 'PENDING'` },
      { name: 'warehouses', sql: `SELECT COUNT(*) FROM warehouses WHERE status = 'ACTIVE'` },
      { name: 'assetVal', sql: `
        SELECT COALESCE(SUM(s.quantity * COALESCE(m.unit_price, 0)), 0) as total_asset_value
        FROM inventory_stocks s
        JOIN material_masters m ON s.material_id = m.id
      `}
    ];

    for (const q of queries) {
      try {
        await client.query(q.sql);
        results[q.name] = 'SUCCESS';
      } catch (err: any) {
        results[q.name] = 'ERROR: ' + err.message;
      }
    }
    
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ message: 'Connection Error', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
