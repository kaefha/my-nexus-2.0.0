import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'delivery_orders'
    `);
    return NextResponse.json({ columns: res.rows.map(r => r.column_name) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  } finally {
    client.release();
  }
}
