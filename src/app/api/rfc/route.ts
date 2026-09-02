import { NextResponse } from 'next/server';
import { pool, generateId } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'ALL';
  const search = searchParams.get('search') || '';
  const limit = parseInt(searchParams.get('limit') || '100');

  try {
    let queryStr = `
      SELECT 
        cr.id, 
        cr.rfc_number as "rfcNumber", 
        cr.status, 
        cr.notes, 
        cr.created_at as "createdAt",
        cr.requestor_id as "requestorId",
        u.name as "requestorName",
        u.role as "requestorRole",
        p.project_name as "projectName",
        w.name as "warehouseName",
        (SELECT COUNT(*) FROM consumption_request_items i WHERE i.consumption_request_id = cr.id) as "itemsCount"
      FROM consumption_requests cr
      LEFT JOIN users u ON cr.requestor_id = u.id
      LEFT JOIN projects p ON cr.project_id = p.id
      LEFT JOIN warehouses w ON cr.warehouse_id = w.id
      WHERE 1=1
    `;
    const queryParams: any[] = [];

    if (status !== 'ALL') {
      queryParams.push(status);
      queryStr += ` AND cr.status = $${queryParams.length}`;
    }

    if (search) {
      queryParams.push(`%${search.toLowerCase()}%`);
      queryStr += ` AND (LOWER(cr.rfc_number) LIKE $${queryParams.length} OR LOWER(p.project_name) LIKE $${queryParams.length} OR LOWER(w.name) LIKE $${queryParams.length})`;
    }

    queryStr += ` ORDER BY cr.created_at DESC LIMIT $${queryParams.length + 1}`;
    queryParams.push(limit);

    const res = await pool.query(queryStr, queryParams);
    
    return NextResponse.json({ data: res.rows }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching consumption requests:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { projectId, warehouseId, requestorId, notes, items } = body;

  if (!projectId || !warehouseId || !requestorId || !items || items.length === 0) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const status = 'WAITING_APPROVAL';

    // Generate RFC number
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const rfcNumber = `RFC-\${dateStr}-\${randomSuffix}`;

    const id = generateId();

    await client.query(`
      INSERT INTO consumption_requests (id, rfc_number, project_id, warehouse_id, requestor_id, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, rfcNumber, projectId, warehouseId, requestorId, status, notes || '']);

    for (const item of items) {
      const itemId = generateId();
      await client.query(`
        INSERT INTO consumption_request_items (id, consumption_request_id, material_id, request_qty, notes)
        VALUES ($1, $2, $3, $4, $5)
      `, [itemId, id, item.materialId, item.requestQty, item.notes || '']);
    }

    await client.query('COMMIT');
    return NextResponse.json({ message: 'RFC created successfully', data: { id } }, { status: 201 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating RFC:', error);
    return NextResponse.json({ message: 'Failed to create RFC', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
