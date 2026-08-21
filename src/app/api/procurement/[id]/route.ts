import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await context.params;
    const { id } = params;
    
    // Fetch PO data
    const poRes = await pool.query(`
      SELECT 
        po.id, 
        po.po_number as "poNumber", 
        po.vendor, 
        po.rfc_id as "rfcId", 
        po.expected_date as "expectedDate", 
        po.notes, 
        po.status, 
        po.items_count as "itemsCount", 
        po.transporter,
        po.driver_name as "driverName",
        po.vehicle_number as "vehicleNumber",
        po.deliver_to as "deliverTo",
        po.signed_document_url as "signedDocumentUrl",
        po.created_at as "createdAt",
        po.approver_id as "approverId",
        u.name as "approverName",
        u.role as "approverRole"
      FROM purchase_orders po
      LEFT JOIN users u ON po.approver_id = u.id
      WHERE po.id = $1
    `, [id]);
    if (poRes.rows.length === 0) {
      return NextResponse.json({ message: 'Purchase Order not found' }, { status: 404 });
    }
    
    // Fetch PO Items along with material names
    const itemsRes = await pool.query(`
      SELECT 
        poi.id, 
        poi.material_id as "materialId", 
        poi.quantity, 
        poi.unit_price as "unitPrice",
        poi.total_price as "totalPrice",
        poi.notes, 
        m.material_name as "materialName"
      FROM purchase_order_items poi
      LEFT JOIN material_masters m ON poi.material_id = m.id
      WHERE poi.purchase_order_id = $1
    `, [id]);
    
    return NextResponse.json({ 
      data: { 
        ...poRes.rows[0], 
        items: itemsRes.rows 
      } 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching PO details:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

  export async function PUT(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await context.params;
    const { id } = params;
    const body = await request.json();
    const { poNumber, vendor, rfcId, expectedDate, notes, items, transporter, driverName, vehicleNumber, deliverTo, approverId } = body;

    // Start transaction
    await pool.query('BEGIN');

    // Update PO
    await pool.query(`
      UPDATE purchase_orders 
      SET 
        po_number = $1, 
        vendor = $2, 
        rfc_id = $3, 
        expected_date = $4, 
        notes = $5,
        transporter = $6,
        driver_name = $7,
        vehicle_number = $8,
        deliver_to = $9,
        approver_id = $10,
        updated_at = NOW()
      WHERE id = $11
    `, [
      poNumber, 
      vendor, 
      rfcId || null, 
      expectedDate || null, 
      notes || null, 
      transporter || null,
      driverName || null,
      vehicleNumber || null,
      deliverTo || null,
      approverId || null,
      id
    ]);

    // If items are provided, delete existing and insert new
    if (items && Array.isArray(items)) {
      await pool.query('DELETE FROM purchase_order_items WHERE purchase_order_id = $1', [id]);
      
      for (const item of items) {
        await pool.query(`
          INSERT INTO purchase_order_items (
            purchase_order_id, 
            material_id, 
            quantity, 
            notes
          ) VALUES ($1, $2, $3, $4)
        `, [
          id, 
          item.materialId, 
          item.quantity, 
          item.notes || null
        ]);
      }
      
      // Update items count
      await pool.query('UPDATE purchase_orders SET items_count = $1 WHERE id = $2', [items.length, id]);
    }

    await pool.query('COMMIT');
    return NextResponse.json({ message: 'Purchase Order updated successfully' }, { status: 200 });
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error('Error updating PO:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await context.params;
    const { id } = params;

    // Start transaction
    await pool.query('BEGIN');

    // Delete PO items first (foreign key constraint)
    await pool.query('DELETE FROM purchase_order_items WHERE purchase_order_id = $1', [id]);
    
    // Delete PO
    const res = await pool.query('DELETE FROM purchase_orders WHERE id = $1 RETURNING id', [id]);
    
    if (res.rowCount === 0) {
      await pool.query('ROLLBACK');
      return NextResponse.json({ message: 'Purchase Order not found' }, { status: 404 });
    }

    await pool.query('COMMIT');
    return NextResponse.json({ message: 'Purchase Order deleted successfully' }, { status: 200 });
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error('Error deleting PO:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await context.params;
    const { id } = params;
    const body = await request.json();
    const { signedDocumentUrl } = body;

    if (signedDocumentUrl !== undefined) {
      const res = await pool.query(
        `UPDATE purchase_orders SET signed_document_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [signedDocumentUrl, id]
      );
      if (res.rowCount === 0) return NextResponse.json({ message: 'PO not found' }, { status: 404 });
      return NextResponse.json({ data: res.rows[0], message: 'PO updated successfully' }, { status: 200 });
    }

    return NextResponse.json({ message: 'No valid fields provided for update' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in PATCH PO:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
