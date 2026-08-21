import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT po_number, status, approver_id FROM purchase_orders ORDER BY created_at DESC LIMIT 20');
    return NextResponse.json({ pos: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  } finally {
    client.release();
  }
}
