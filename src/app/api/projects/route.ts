import { NextResponse } from 'next/server';
import { pool, generateId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').toLowerCase();
    
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sort = searchParams.get('sort') || 'newest';
    
    let queryStr = 'SELECT * FROM projects';
    const queryParams: any[] = [];
    const conditions: string[] = [];

    if (search) {
      conditions.push(`(LOWER(project_name) LIKE $${queryParams.length + 1} OR LOWER(project_code) LIKE $${queryParams.length + 1} OR LOWER(customer) LIKE $${queryParams.length + 1} OR LOWER(region) LIKE $${queryParams.length + 1})`);
      queryParams.push(`%${search}%`);
    }

    if (startDate) {
      conditions.push(`start_date >= $${queryParams.length + 1}`);
      queryParams.push(startDate);
    }
    
    if (endDate) {
      conditions.push(`start_date <= $${queryParams.length + 1}`);
      queryParams.push(endDate);
    }

    if (conditions.length > 0) {
      queryStr += ` WHERE ${conditions.join(' AND ')}`;
    }

    if (sort === 'name-asc') {
      queryStr += ' ORDER BY project_name ASC';
    } else if (sort === 'name-desc') {
      queryStr += ' ORDER BY project_name DESC';
    } else if (sort === 'oldest') {
      queryStr += ' ORDER BY created_at ASC';
    } else {
      queryStr += ' ORDER BY created_at DESC';
    }
    
    const res = await pool.query(queryStr, queryParams);
    
    const projects = res.rows.map((row: any) => ({
      id: row.id,
      projectCode: row.project_code || '',
      projectName: row.project_name,
      customer: row.customer,
      region: row.region,
      startDate: row.start_date,
      endDate: row.end_date,
      pic: row.pic,
      whatsappNumber: row.whatsapp_number,
      projectType: row.project_type,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({ data: projects }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectCode, projectName, customer, region, startDate, pic, whatsappNumber, projectType, status } = body;

    if (!projectName) {
      return NextResponse.json({ message: 'Project name is required' }, { status: 400 });
    }

    const id = generateId();

    // Auto-generate project_code if not provided
    let code = (projectCode || '').trim();
    if (!code) {
      const year = new Date().getFullYear();
      const countRes = await pool.query('SELECT COUNT(*) FROM projects');
      const seq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(3, '0');
      code = `PRJ-${year}-${seq}`;
    }

    const res = await pool.query(`
      INSERT INTO projects (id, project_code, project_name, customer, region, start_date, pic, whatsapp_number, project_type, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [id, code, projectName, customer, region, startDate || null, pic, whatsappNumber || null, projectType || null, status || 'PLANNING']);

    await pool.query(`
      INSERT INTO project_activities (id, project_id, action, details)
      VALUES ($1, $2, $3, $4)
    `, [generateId(), id, 'CREATED', `Project initialized with Code ${code} in PLANNING stage`]);

    const row = res.rows[0];
    const project = {
      id: row.id,
      projectCode: row.project_code || code,
      projectName: row.project_name,
      customer: row.customer,
      region: row.region,
      startDate: row.start_date,
      endDate: row.end_date,
      pic: row.pic,
      whatsappNumber: row.whatsapp_number,
      projectType: row.project_type,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    return NextResponse.json({ data: project, message: 'Project created' }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, projectCode, projectName, customer, region, startDate, pic, whatsappNumber, projectType, status } = body;

    if (!id || !projectName) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const client = await pool.connect();
    let updatedRow;
    try {
      await client.query('BEGIN');
      
      const oldRes = await client.query('SELECT status FROM projects WHERE id = $1', [id]);
      if (oldRes.rowCount === 0) {
        throw new Error('Project not found');
      }
      const oldStatus = oldRes.rows[0].status;
      const newStatus = status || 'PLANNING';

      const res = await client.query(`
        UPDATE projects 
        SET project_code = $1, project_name = $2, customer = $3, region = $4, start_date = $5, 
            pic = $6, whatsapp_number = $7, project_type = $8, status = $9, updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
        RETURNING *
      `, [projectCode || null, projectName, customer, region, startDate || null, pic, whatsappNumber || null, projectType || null, newStatus, id]);

      updatedRow = res.rows[0];

      if (oldStatus !== newStatus) {
        await client.query(`
          INSERT INTO project_activities (id, project_id, action, details)
          VALUES ($1, $2, $3, $4)
        `, [generateId(), id, 'STATUS_CHANGED', `Status changed from ${oldStatus} to ${newStatus}`]);
      } else {
        await client.query(`
          INSERT INTO project_activities (id, project_id, action, details)
          VALUES ($1, $2, $3, $4)
        `, [generateId(), id, 'UPDATED', 'Project details updated']);
      }
      
      await client.query('COMMIT');
    } catch (e: any) {
      await client.query('ROLLBACK');
      if (e.message === 'Project not found') {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
      }
      throw e;
    } finally {
      client.release();
    }

    return NextResponse.json({ 
      data: {
        ...updatedRow,
        projectCode: updatedRow.project_code || ''
      }, 
      message: 'Project updated' 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating project:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Missing project ID' }, { status: 400 });
    }

    const res = await pool.query(`DELETE FROM projects WHERE id = $1 RETURNING id`, [id]);

    if (res.rowCount === 0) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Project deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
