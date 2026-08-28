import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  try {
    const materialsRes = await client.query(`SELECT COUNT(*) FROM material_masters WHERE is_active = true`);
    const projectsRes = await client.query(`SELECT COUNT(*) FROM projects`);
    const rfcRes = await client.query(`SELECT COUNT(*) FROM rfcs WHERE status IN ('WAITING_SITE_APPROVAL', 'WAITING_FINANCE_APPROVAL', 'SUBMITTED')`);
    
    const poRes = await client.query(`SELECT COUNT(*) FROM purchase_orders WHERE status = 'ACTIVE'`);
    const doRes = await client.query(`SELECT COUNT(*) FROM delivery_orders WHERE status = 'SHIPPED'`);
    const transferRes = await client.query(`SELECT COUNT(*) FROM transfers WHERE status = 'PENDING'`);
    const warehouseRes = await client.query(`SELECT COUNT(*) FROM warehouses WHERE status = 'ACTIVE'`);
    
    // Asset Value Calculation (Total Stock Qty * Unit Price)
    const assetValRes = await client.query(`
      SELECT COALESCE(SUM(s.quantity * COALESCE(m.unit_price, 0)), 0) as total_asset_value
      FROM inventory_stocks s
      JOIN material_masters m ON s.material_id = m.id
    `);

    return NextResponse.json({
      totalMaterials: parseInt(materialsRes.rows[0].count, 10),
      activeProjects: parseInt(projectsRes.rows[0].count, 10),
      pendingRfc: parseInt(rfcRes.rows[0].count, 10),
      activePo: parseInt(poRes.rows[0].count, 10),
      onDelivery: parseInt(doRes.rows[0].count, 10),
      pendingTransfers: parseInt(transferRes.rows[0].count, 10),
      totalWarehouses: parseInt(warehouseRes.rows[0].count, 10),
      totalAssetValue: parseFloat(assetValRes.rows[0].total_asset_value) || 0,
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
