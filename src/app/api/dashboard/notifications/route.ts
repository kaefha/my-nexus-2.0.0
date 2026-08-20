import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const client = await pool.connect();
    const role = user.role?.toUpperCase();
    const userId = user.id;

    const dynamicNotifications: any[] = [];

    // 1. RFC Approvals
    if (['PROCUREMENT', 'OWNER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      const rfcRes = await client.query(`
        SELECT id, rfc_number, created_at 
        FROM rfcs 
        WHERE status = 'WAITING_APPROVAL' 
        AND (site_approver_id IS NULL OR site_approver_id = $1)
        ORDER BY created_at DESC LIMIT 5
      `, [userId]);
      
      rfcRes.rows.forEach(r => {
        dynamicNotifications.push({
          id: `rfc-${r.id}`,
          title: 'RFC Approval Required',
          message: `Request For Certificate ${r.rfc_number} is waiting for your approval.`,
          link: '/rfc/approval',
          createdAt: r.created_at,
          isRead: false,
          type: 'RFC_APPROVAL'
        });
      });
    }

    // 2. PO Approvals
    let targetPoStatuses: string[] = [];
    if (['PROJECT_MANAGER', 'SITE_MANAGER'].includes(role)) {
      targetPoStatuses = ['WAITING_OPERATION_APPROVAL'];
    } else if (['ADMIN'].includes(role)) {
      targetPoStatuses = ['WAITING_ADMIN_APPROVAL'];
    } else if (['OWNER', 'PROCUREMENT', 'SUPER_ADMIN'].includes(role)) {
      targetPoStatuses = ['WAITING_OWNER_APPROVAL'];
    }

    if (targetPoStatuses.length > 0) {
      const statusPlaceholders = targetPoStatuses.map((_, i) => `$${i + 1}`).join(',');
      const poRes = await client.query(`
        SELECT id, po_number, created_at 
        FROM purchase_orders 
        WHERE status IN (${statusPlaceholders})
        ORDER BY created_at DESC LIMIT 5
      `, targetPoStatuses);
      
      poRes.rows.forEach(p => {
        dynamicNotifications.push({
          id: `po-${p.id}`,
          title: 'PO Approval Required',
          message: `Purchase Order ${p.po_number} is waiting for your approval.`,
          link: `/procurement/${p.id}`,
          createdAt: p.created_at,
          isRead: false,
          type: 'PO_APPROVAL'
        });
      });
    }

    // Sort combined notifications by date descending
    dynamicNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    client.release();

    return NextResponse.json(dynamicNotifications);
  } catch (error) {
    console.error('Error fetching dynamic notifications:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
