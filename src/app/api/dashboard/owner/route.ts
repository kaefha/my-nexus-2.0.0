import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Total Warehouses
    const warehouseRes = await pool.query(`SELECT COUNT(*) FROM warehouses`);
    const totalWarehouses = parseInt(warehouseRes.rows[0].count, 10) || 0;

    // 2. Total Material Types (SKU)
    const materialTypesRes = await pool.query(`SELECT COUNT(*) FROM material_masters`);
    const totalMaterialTypes = parseInt(materialTypesRes.rows[0].count, 10) || 0;

    // 3. Total Material Stock (Sum of all quantity in inventory_stocks)
    const stockRes = await pool.query(`SELECT COALESCE(SUM(quantity), 0) as total FROM inventory_stocks`);
    const totalMaterialStock = parseInt(stockRes.rows[0].total, 10) || 0;

    // 4. Recent Warehouses with Activity
    const recentWarehousesRes = await pool.query(`
      SELECT w.id, w.name, w.code, w.location, MAX(t.created_at) as last_activity
      FROM inventory_transactions t
      JOIN warehouses w ON t.warehouse_id = w.id
      GROUP BY w.id, w.name, w.code, w.location
      ORDER BY last_activity DESC
      LIMIT 5
    `);

    // 5. Recent Materials with Activity
    const recentMaterialsRes = await pool.query(`
      SELECT m.id, m.material_code, m.material_name, m.category, MAX(t.created_at) as last_activity
      FROM inventory_transactions t
      JOIN material_masters m ON t.material_id = m.id
      GROUP BY m.id, m.material_code, m.material_name, m.category
      ORDER BY last_activity DESC
      LIMIT 5
    `);

    return NextResponse.json({
      data: {
        totalWarehouses,
        totalMaterialTypes,
        totalMaterialStock,
        recentWarehouses: recentWarehousesRes.rows.map(row => ({
          id: row.id,
          name: row.name,
          code: row.code,
          location: row.location,
          lastActivity: row.last_activity
        })),
        recentMaterials: recentMaterialsRes.rows.map(row => ({
          id: row.id,
          code: row.material_code,
          name: row.material_name,
          category: row.category,
          lastActivity: row.last_activity
        }))
      }
    });
  } catch (error: any) {
    console.error('Failed to fetch owner dashboard data:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
