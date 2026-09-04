import { NextResponse } from 'next/server';
import { pool, generateId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { warehouseId, items } = await request.json();

    if (!warehouseId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: 'warehouseId and items array are required' }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const item of items) {
        const { materialId, quantity, notes } = item;

        if (!materialId || quantity === undefined || quantity <= 0) {
          throw new Error('Invalid materialId or quantity in items');
        }

        // 1. Upsert into inventory_stocks
        const stockId = generateId();
        await client.query(`
          INSERT INTO inventory_stocks (id, warehouse_id, material_id, quantity)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (warehouse_id, material_id)
          DO UPDATE SET 
            quantity = inventory_stocks.quantity + EXCLUDED.quantity,
            last_updated = CURRENT_TIMESTAMP
        `, [stockId, warehouseId, materialId, quantity]);

        // 2. Insert into inventory_transactions
        const txId = generateId();
        await client.query(`
          INSERT INTO inventory_transactions (id, warehouse_id, material_id, transaction_type, quantity, notes)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [txId, warehouseId, materialId, 'IN_MANUAL_ENTRY', quantity, notes || 'Manual Stock Adjustment']);
      }

      await client.query('COMMIT');
      return NextResponse.json({ message: 'Stock added successfully' }, { status: 200 });
    } catch (txError: any) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Manual stock entry error:', error);
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}
