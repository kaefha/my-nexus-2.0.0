import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const res = await pool.query("SELECT id, po_number, status, vendor FROM purchase_orders ORDER BY created_at DESC LIMIT 10");
  return NextResponse.json(res.rows);
}
