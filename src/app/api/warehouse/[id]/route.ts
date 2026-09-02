import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    if (!id) {
      return NextResponse.json({ message: 'Warehouse ID is required' }, { status: 400 });
    }

    const res = await pool.query(`
      SELECT 
        w.*,
        COUNT(DISTINCT s.material_id) as total_materials,
        COALESCE(SUM(s.quantity), 0) as total_stock
      FROM warehouses w
      LEFT JOIN inventory_stocks s ON w.id = s.warehouse_id
      WHERE w.id = $1
      GROUP BY w.id
    `, [id]);
    
    if (res.rowCount === 0) {
      return NextResponse.json({ message: 'Warehouse not found' }, { status: 404 });
    }

    const row = res.rows[0];
    
    // Fetch associated projects from warehouse_projects mapping
    const projectsRes = await pool.query(`
      SELECT p.id, p.project_name as name, p.project_code as code
      FROM warehouse_projects wp
      JOIN projects p ON wp.project_id = p.id
      WHERE wp.warehouse_id = $1
    `, [id]);
    
    const warehouse = {
      id: row.id,
      code: row.code,
      name: row.name,
      location: row.location,
      coordinates: row.coordinates,
      evidence: row.evidence,
      type: row.type,
      capacity: row.capacity,
      status: row.status,
      totalMaterials: parseInt(row.total_materials, 10) || 0,
      totalStock: parseInt(row.total_stock, 10) || 0,
      projects: projectsRes.rows.map(p => ({
        id: p.id,
        name: p.name,
        code: p.code
      }))
    };

    return NextResponse.json({ data: warehouse }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching warehouse:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
