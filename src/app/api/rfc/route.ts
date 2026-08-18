import { NextResponse } from 'next/server';
import { pool, generateId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').toLowerCase();
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sort = searchParams.get('sort') || 'desc';
    
    // Complex query to join with projects and count items
    let queryStr = `
      SELECT r.*, 
             p.project_name, p.customer,
             u.name as requestor_name, u.role as requestor_role,
             COALESCE(f_app.name, s_app.name) as approver_name,
             COALESCE(f_app.role, s_app.role) as approver_role,
             (SELECT COUNT(*) FROM rfc_items i WHERE i.rfc_id = r.id) as items_count
      FROM rfcs r
      LEFT JOIN projects p ON r.project_id = p.id
      LEFT JOIN users u ON r.requestor_id = u.id
      LEFT JOIN users s_app ON r.site_approver_id = s_app.id
      LEFT JOIN users f_app ON r.finance_approver_id = f_app.id
      WHERE 1=1
    `;
    const queryParams: any[] = [];

    if (search) {
      queryParams.push(`%${search}%`);
      queryStr += ` AND (LOWER(r.rfc_number) LIKE $${queryParams.length} OR LOWER(p.project_name) LIKE $${queryParams.length} OR LOWER(r.location) LIKE $${queryParams.length})`;
    }

    if (status && status !== 'ALL') {
      if (status === 'HISTORY') {
        queryStr += ` AND r.status IN ('APPROVED', 'REJECTED')`;
      } else {
        queryParams.push(status);
        queryStr += ` AND r.status = $${queryParams.length}`;
      }
    }

    if (startDate) {
      queryParams.push(startDate);
      queryStr += ` AND r.created_at >= $${queryParams.length}`;
    }

    if (endDate) {
      queryParams.push(`${endDate} 23:59:59`);
      queryStr += ` AND r.created_at <= $${queryParams.length}`;
    }

    const sortOrder = sort === 'asc' ? 'ASC' : 'DESC';
    queryStr += ` ORDER BY r.created_at ${sortOrder}`;
    
    const res = await pool.query(queryStr, queryParams);
    
    const rfcs = res.rows.map((row: any) => ({
      id: row.id,
      rfcNumber: row.rfc_number,
      projectId: row.project_id,
      requestorId: row.requestor_id,
      location: row.location,
      status: row.status,
      approvalDestination: row.approval_destination,
      notes: row.notes,
      requestDocument: row.request_document,
      signedDocument: row.signed_document,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      project: {
        projectName: row.project_name,
        customer: row.customer
      },
      requestor: {
        name: row.requestor_name,
        role: row.requestor_role
      },
      approver: {
        name: row.approver_name,
        role: row.approver_role
      },
      _count: {
        items: parseInt(row.items_count || '0', 10)
      }
    }));

    return NextResponse.json({ data: rfcs }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching RFCs:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { projectId, location, requestorId, requestDate, approvalDestination, notes, items, requestDocument } = body;

    if (!projectId || !location || !requestorId || !approvalDestination || !items || !items.length) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    await client.query('BEGIN');

    // RFCs start with WAITING_APPROVAL
    const status = 'WAITING_APPROVAL';

    const id = generateId();
    // Use format RFC-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const rfcNumber = `RFC-${dateStr}-${randomSuffix}`;

    await client.query(`
      INSERT INTO rfcs (id, rfc_number, project_id, requestor_id, location, status, notes, request_document, request_date, site_approver_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [id, rfcNumber, projectId, requestorId, location, status, notes || '', requestDocument || null, requestDate ? new Date(requestDate) : new Date(), approvalDestination]);

    for (const item of items) {
      if (!item.materialId || !item.requestQty) continue;
      
      const itemId = generateId();
      await client.query(`
        INSERT INTO rfc_items (id, rfc_id, material_id, request_qty, notes)
        VALUES ($1, $2, $3, $4, $5)
      `, [itemId, id, item.materialId, parseInt(item.requestQty, 10), item.notes || '']);
    }

    await client.query('COMMIT');

    return NextResponse.json({ message: 'RFC created successfully', data: { id: id } }, { status: 201 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating RFC:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
