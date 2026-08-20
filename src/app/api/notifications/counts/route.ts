import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    
    const role = user.role?.toUpperCase();
    const userId = user.id;

    // 1. Count pending RFC approvals
    let rfcApprovals = 0;
    if (['PROCUREMENT', 'OWNER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      const rfcRes = await client.query(`
        SELECT COUNT(*) as count 
        FROM rfcs 
        WHERE status = 'WAITING_APPROVAL' 
        AND (site_approver_id IS NULL OR site_approver_id = $1)
      `, [userId]);
      rfcApprovals = parseInt(rfcRes.rows[0].count, 10);
    }

    // 2. Count pending POs
    let poApprovals = 0;
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
        SELECT COUNT(*) as count 
        FROM purchase_orders 
        WHERE status IN (${statusPlaceholders})
      `, targetPoStatuses);
      poApprovals = parseInt(poRes.rows[0].count, 10);
    }

    // 3. Count ready Material Receives (DOs that are shipping or waiting to be received)
    // For Procurement, Owner, Site Manager, Project Manager
    let materialReceives = 0;
    if (['PROCUREMENT', 'OWNER', 'SITE_MANAGER', 'PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      const doRes = await client.query(`
        SELECT COUNT(*) as count 
        FROM delivery_orders 
        WHERE status IN ('SHIPPING', 'WAITING')
      `);
      materialReceives = parseInt(doRes.rows[0].count, 10);
    }

    client.release();

    return NextResponse.json({
      data: {
        rfcApprovals,
        poApprovals,
        materialReceives
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching notification counts:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
