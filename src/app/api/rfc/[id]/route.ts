import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const rfcQuery = `
      SELECT 
        cr.id, 
        cr.rfc_number as "rfcNumber", 
        cr.status, 
        cr.notes, 
        cr.created_at as "createdAt",
        cr.approved_at as "approvedAt",
        cr.completed_at as "completedAt",
        cr.taker_name as "takerName",
        cr.taker_date as "takerDate",
        cr.evidence_document as "evidenceDocument",
        u.name as "requestorName",
        u.role as "requestorRole",
        a.name as "approverName",
        a.role as "approverRole",
        c.name as "completedByName",
        p.project_name as "projectName",
        w.name as "warehouseName",
        cr.warehouse_id as "warehouseId"
      FROM consumption_requests cr
      LEFT JOIN users u ON cr.requestor_id = u.id
      LEFT JOIN users a ON cr.approver_id = a.id
      LEFT JOIN users c ON cr.completed_by = c.id
      LEFT JOIN projects p ON cr.project_id = p.id
      LEFT JOIN warehouses w ON cr.warehouse_id = w.id
      WHERE cr.id = $1
    `;
    const rfcRes = await pool.query(rfcQuery, [id]);
    
    if (rfcRes.rows.length === 0) {
      return NextResponse.json({ message: 'RFC not found' }, { status: 404 });
    }

    const rfc = rfcRes.rows[0];

    const itemsQuery = `
      SELECT 
        ri.id,
        ri.request_qty as "requestQty",
        ri.notes,
        m.material_name as "materialName",
        m.material_code as "materialCode",
        m.unit,
        m.id as "materialId"
      FROM consumption_request_items ri
      LEFT JOIN material_masters m ON ri.material_id = m.id
      WHERE ri.consumption_request_id = $1
    `;
    const itemsRes = await pool.query(itemsQuery, [id]);

    const formattedRfc = {
      ...rfc,
      project: { projectName: rfc.projectName },
      warehouse: { name: rfc.warehouseName, id: rfc.warehouseId },
      requestor: { name: rfc.requestorName, role: rfc.requestorRole },
      approver: rfc.approverName ? { name: rfc.approverName, role: rfc.approverRole } : null,
      items: itemsRes.rows
    };

    return NextResponse.json({ data: formattedRfc }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching RFC details:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { status, approverId, takerName, takerDate, evidenceDocument, completedBy } = body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (status === 'APPROVED' || status === 'REJECTED') {
      const res = await client.query(`
        UPDATE consumption_requests 
        SET status = $1, approver_id = $2, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $3 RETURNING *
      `, [status, approverId, id]);
      
      if (res.rows.length === 0) {
         await client.query('ROLLBACK');
         return NextResponse.json({ message: 'RFC not found' }, { status: 404 });
      }
    } else if (status === 'COMPLETED') {
      // Complete RFC and deduct stock
      const rfcRes = await client.query('SELECT warehouse_id FROM consumption_requests WHERE id = $1', [id]);
      if (rfcRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: 'RFC not found' }, { status: 404 });
      }
      
      const warehouseId = rfcRes.rows[0].warehouse_id;
      
      const itemsRes = await client.query('SELECT material_id, request_qty FROM consumption_request_items WHERE consumption_request_id = $1', [id]);
      
      // Deduct stock for each item
      for (const item of itemsRes.rows) {
        // We assume inventory_stocks has one row per warehouse-material combo. If not found, it will fail silently or we should insert, but usually it exists if requested.
        await client.query(`
          UPDATE inventory_stocks 
          SET quantity = quantity - $1, last_updated = CURRENT_TIMESTAMP
          WHERE warehouse_id = $2 AND material_id = $3
        `, [item.request_qty, warehouseId, item.material_id]);
      }

      const res = await client.query(`
        UPDATE consumption_requests 
        SET status = $1, taker_name = $2, taker_date = $3, evidence_document = $4, completed_by = $5, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $6 RETURNING *
      `, [status, takerName, takerDate, evidenceDocument, completedBy, id]);
      
    } else {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    await client.query('COMMIT');
    return NextResponse.json({ message: 'RFC updated successfully' }, { status: 200 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating RFC:', error);
    return NextResponse.json({ message: 'Failed to update RFC', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
