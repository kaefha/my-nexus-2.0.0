import { NextResponse } from 'next/server';
import { pool, generateId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').toLowerCase();
    
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'name-asc';
    
    let queryStr = `
      SELECT 
        w.*,
        COUNT(DISTINCT s.material_id) as total_materials,
        COALESCE(SUM(s.quantity), 0) as total_stock
      FROM warehouses w
      LEFT JOIN inventory_stocks s ON w.id = s.warehouse_id
    `;
    const queryParams: any[] = [];
    const conditions: string[] = [];

    if (search) {
      conditions.push(`(LOWER(w.code) LIKE $${queryParams.length + 1} OR LOWER(w.name) LIKE $${queryParams.length + 1} OR LOWER(w.location) LIKE $${queryParams.length + 1})`);
      queryParams.push(`%${search}%`);
    }
    if (type && type !== 'ALL') {
      conditions.push(`w.type = $${queryParams.length + 1}`);
      queryParams.push(type);
    }
    if (status && status !== 'ALL') {
      conditions.push(`w.status = $${queryParams.length + 1}`);
      queryParams.push(status);
    }

    if (conditions.length > 0) {
      queryStr += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryStr += ` GROUP BY w.id, w.code, w.name, w.location, w.coordinates, w.evidence, w.type, w.capacity, w.status, w.created_at, w.updated_at`;

    if (sort === 'name-desc') {
      queryStr += ' ORDER BY w.name DESC';
    } else if (sort === 'code-asc') {
      queryStr += ' ORDER BY w.code ASC';
    } else if (sort === 'code-desc') {
      queryStr += ' ORDER BY w.code DESC';
    } else {
      queryStr += ' ORDER BY w.name ASC';
    }
    
    const res = await pool.query(queryStr, queryParams);
    
    const warehouses = res.rows.map((row: any) => ({
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
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({ data: warehouses }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching warehouses:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, location, coordinates, evidence, type, capacity } = body;

    if (!code || !name) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const id = generateId();

    const res = await pool.query(`
      INSERT INTO warehouses (id, code, name, location, coordinates, evidence, type, capacity, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [id, code, name, location || '', coordinates || '', evidence || null, type || 'MAIN', capacity || '', 'ACTIVE']);

    const row = res.rows[0];
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
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    return NextResponse.json({ data: warehouse, message: 'Warehouse created' }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating warehouse:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, code, name, location, coordinates, evidence, type, capacity, status } = body;

    if (!id || !code || !name) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const res = await pool.query(`
      UPDATE warehouses 
      SET code = $1, name = $2, location = $3, coordinates = $4, evidence = $5, type = $6, 
          capacity = $7, status = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [code, name, location || '', coordinates || '', evidence || null, type || 'MAIN', capacity || '', status || 'ACTIVE', id]);

    if (res.rowCount === 0) {
      return NextResponse.json({ message: 'Warehouse not found' }, { status: 404 });
    }

    return NextResponse.json({ data: res.rows[0], message: 'Warehouse updated' }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating warehouse:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const singleId = searchParams.get('id');
    const paramIds = searchParams.get('ids');
    
    let ids: string[] = [];

    if (singleId) {
      ids.push(singleId);
    } else if (paramIds) {
      ids = paramIds.split(',').filter(Boolean);
    } else {
      try {
        const body = await request.json();
        if (body.ids && Array.isArray(body.ids)) {
          ids = body.ids;
        } else if (body.id) {
          ids = [body.id];
        }
      } catch (e) {
        // No body
      }
    }

    if (ids.length === 0) {
      return NextResponse.json({ message: 'Missing warehouse ID(s)' }, { status: 400 });
    }

    const res = await pool.query(`DELETE FROM warehouses WHERE id = ANY($1::uuid[]) RETURNING id`, [ids]);

    if (res.rowCount === 0) {
      return NextResponse.json({ message: 'No warehouses found to delete' }, { status: 404 });
    }

    return NextResponse.json({ message: `Successfully deleted ${res.rowCount} warehouse(s)`, count: res.rowCount }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting warehouse(s):', error);
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}
