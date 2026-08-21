import { NextResponse } from 'next/server';
import { pool, generateId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    let queryStr = 'SELECT * FROM purchase_orders';
    const queryParams: any[] = [];
    const conditions = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(LOWER(po_number) LIKE $${paramIndex} OR LOWER(vendor) LIKE $${paramIndex})`);
      queryParams.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    } else if (type === 'active') {
      conditions.push(`status IN ('DRAFT', 'WAITING_APPROVAL', 'WAITING_OPERATION_APPROVAL', 'WAITING_ADMIN_APPROVAL', 'WAITING_OWNER_APPROVAL')`);
    } else if (type === 'history') {
      conditions.push(`status IN ('APPROVED', 'REJECTED', 'PROCESSED', 'SHIPPED', 'DELIVERED', 'COMPLETED')`);
    }

    if (conditions.length > 0) {
      queryStr += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryStr += ' ORDER BY created_at DESC';
    
    const res = await pool.query(queryStr, queryParams);
    
    const pos = res.rows.map((row: any) => ({
      id: row.id,
      poNumber: row.po_number,
      vendor: row.vendor,
      rfcId: row.rfc_id,
      expectedDate: row.expected_date,
      notes: row.notes,
      status: row.status,
      itemsCount: row.items_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({ data: pos }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching POs:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

  export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { poNumber, vendor, rfcId, expectedDate, notes, items, transporter, driverName, vehicleNumber, deliverTo, approverId } = body;

    if (!poNumber || !vendor || !approverId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const id = generateId();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const res = await client.query(`
        INSERT INTO purchase_orders (
          id, po_number, vendor, rfc_id, expected_date, notes, status, items_count,
          transporter, driver_name, vehicle_number, deliver_to, approver_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        id, poNumber, vendor, rfcId || null, expectedDate ? new Date(expectedDate) : null, notes || '', 'WAITING_APPROVAL', items?.length || 0,
        transporter || null, driverName || null, vehicleNumber || null, deliverTo || null, approverId
      ]);

      if (items && items.length > 0) {
        for (const item of items) {
          const itemId = generateId();
          await client.query(`
            INSERT INTO purchase_order_items (id, purchase_order_id, material_id, quantity, notes)
            VALUES ($1, $2, $3, $4, $5)
          `, [itemId, id, item.materialId, parseInt(item.quantity, 10), item.notes || '']);
        }
      }
      
      await client.query('COMMIT');
      
      const row = res.rows[0];
      const po = {
        id: row.id,
        poNumber: row.po_number,
        vendor: row.vendor,
        rfcId: row.rfc_id,
        expectedDate: row.expected_date,
        notes: row.notes,
        status: row.status,
        itemsCount: row.items_count,
        transporter: row.transporter,
        driverName: row.driver_name,
        vehicleNumber: row.vehicle_number,
        deliverTo: row.deliver_to,
        signedDocumentUrl: row.signed_document_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      return NextResponse.json({ data: po, message: 'PO created' }, { status: 201 });
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
    } catch (error: any) {
    if (error.code === '23505') { // Postgres unique constraint violation
      return NextResponse.json({ message: 'PO Number already exists' }, { status: 400 });
    }
    console.error('Error creating PO:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
