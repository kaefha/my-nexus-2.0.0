import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  try {
    const results: Record<string, any> = {};
    
    // Check columns in material_masters
    try {
      const colRes = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'material_masters'
      `);
      results['columns'] = colRes.rows.map(r => r.column_name);
    } catch (e: any) {
      results['columns_error'] = e.message;
    }

    // Check project URL
    results['supabase_url'] = process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not Set';
    results['database_url_starts_with'] = process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) : 'Not Set';
    
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ message: 'Connection Error', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
