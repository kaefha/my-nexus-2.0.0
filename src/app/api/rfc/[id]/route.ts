import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await context.params;
    const { id } = params;
    
    const rfcQuery = `
      SELECT 
        r.id, 
        r.rfc_number as "rfcNumber", 
        r.project_id as "projectId", 
        r.location, 
        r.requestor_id as "requestorId", 
        r.notes, 
        r.status, 
        r.created_at as "createdAt",
        p.project_name as "projectName",
        u1.name as "requestorName",
        u1.role as "requestorRole",
        s_app.name as "siteApproverName",
        f_app.name as "financeApproverName",
        s_app.role as "siteApproverRole",
        f_app.role as "financeApproverRole"
      FROM rfcs r
      LEFT JOIN projects p ON r.project_id = p.id
      LEFT JOIN users u1 ON r.requestor_id = u1.id
      LEFT JOIN users s_app ON r.site_approver_id = s_app.id
      LEFT JOIN users f_app ON r.finance_approver_id = f_app.id
      WHERE r.id = $1
    `;
    const rfcRes = await pool.query(rfcQuery, [id]);
    
    if (rfcRes.rows.length === 0) {
      return NextResponse.json({ message: 'RFC not found' }, { status: 404 });
    }
    
    const rfc = rfcRes.rows[0];
    
    const itemsRes = await pool.query(`
      SELECT ri.id, ri.material_id as "materialId", ri.request_qty as "requestQty", ri.notes, m.material_name as "materialName", m.material_code as "materialCode", m.unit, m.unit_price as "unitPrice"
      FROM rfc_items ri
      LEFT JOIN material_masters m ON ri.material_id = m.id
      WHERE ri.rfc_id = $1
    `, [id]);
    
    const formattedRfc = {
      ...rfc,
      project: { projectName: rfc.projectName },
      requestor: { name: rfc.requestorName, role: rfc.requestorRole },
      approvalDestinationUser: { 
        name: rfc.siteApproverName || rfc.financeApproverName, 
        role: rfc.siteApproverName ? 'Site Approver' : 'Finance Approver' 
      },
      siteApproverName: rfc.siteApproverName,
      financeApproverName: rfc.financeApproverName,
      siteApproverRole: rfc.siteApproverRole,
      financeApproverRole: rfc.financeApproverRole,
      items: itemsRes.rows
    };
    
    return NextResponse.json({ data: formattedRfc }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching RFC details:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await context.params;
    const { id } = params;
    const body = await request.json();
    
    // Support both approval updates and basic edits
    if (!body.status && !body.isEdit) {
      return NextResponse.json({ message: 'Status or isEdit flag is required' }, { status: 400 });
    }

    if (body.isEdit) {
      // Handle Edit: Update fields and reset to DRAFT
      const { location, notes } = body;
      const res = await pool.query(
        `UPDATE rfcs SET location = $1, notes = $2, status = 'DRAFT', updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
        [location, notes, id]
      );
      if (res.rows.length === 0) return NextResponse.json({ message: 'RFC not found' }, { status: 404 });
      return NextResponse.json({ data: res.rows[0], message: 'RFC updated and reset to DRAFT' }, { status: 200 });
    }

    const { status, signedDocument, approverId } = body;

    let query = `
      UPDATE rfcs 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
    `;
    const queryParams = [status, id];
    let paramIndex = 3;

    if (signedDocument) {
      query += `, signed_document = $${paramIndex}`;
      queryParams.push(signedDocument);
      paramIndex++;
    }

    if (approverId) {
      if (status === 'WAITING_FINANCE_APPROVAL') {
        query += `, site_approver_id = $${paramIndex}`;
        queryParams.push(approverId);
        paramIndex++;
      } else if (status === 'APPROVED' || status === 'REJECTED') {
        query += `, finance_approver_id = $${paramIndex}`;
        queryParams.push(approverId);
        paramIndex++;
      }
    }

    query += ` WHERE id = $2 RETURNING *`;

    const res = await pool.query(query, queryParams);

    if (res.rows.length === 0) {
      return NextResponse.json({ message: 'RFC not found' }, { status: 404 });
    }

    return NextResponse.json({ data: res.rows[0], message: 'RFC updated' }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating RFC:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await context.params;
    const { id } = params;
    
    // First delete items, then the RFC itself due to foreign key constraints
    await pool.query('BEGIN');
    await pool.query('DELETE FROM rfc_items WHERE rfc_id = $1', [id]);
    const res = await pool.query('DELETE FROM rfcs WHERE id = $1 RETURNING id', [id]);
    await pool.query('COMMIT');
    
    if (res.rows.length === 0) {
      return NextResponse.json({ message: 'RFC not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'RFC deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting RFC:', error);
    try { await pool.query('ROLLBACK'); } catch (e) {}
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
