import { NextResponse } from 'next/server';
import { pool, generateId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').toLowerCase();
    
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'name-asc';
    
    let queryStr = 'SELECT * FROM vendors';
    const queryParams: any[] = [];
    const conditions: string[] = [];

    if (search) {
      conditions.push(`(LOWER(vendor_code) LIKE $${queryParams.length + 1} OR LOWER(name) LIKE $${queryParams.length + 1} OR LOWER(contact_person) LIKE $${queryParams.length + 1})`);
      queryParams.push(`%${search}%`);
    }
    
    if (status && status !== 'ALL') {
      const isActive = status === 'ACTIVE';
      conditions.push(`is_active = $${queryParams.length + 1}`);
      queryParams.push(isActive);
    }

    if (conditions.length > 0) {
      queryStr += ` WHERE ${conditions.join(' AND ')}`;
    }

    if (sort === 'name-desc') {
      queryStr += ' ORDER BY name DESC';
    } else if (sort === 'code-asc') {
      queryStr += ' ORDER BY vendor_code ASC';
    } else if (sort === 'code-desc') {
      queryStr += ' ORDER BY vendor_code DESC';
    } else {
      queryStr += ' ORDER BY name ASC';
    }
    
    const res = await pool.query(queryStr, queryParams);
    
    const vendors = res.rows.map((row: any) => ({
      id: row.id,
      vendorCode: row.vendor_code,
      name: row.name,
      contactPerson: row.contact_person,
      email: row.email,
      phone: row.phone,
      address: row.address,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({ data: vendors }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vendorCode, name, contactPerson, email, phone, address } = body;

    if (!vendorCode || !name) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const id = generateId();

    const res = await pool.query(`
      INSERT INTO vendors (id, vendor_code, name, contact_person, email, phone, address, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [id, vendorCode, name, contactPerson || '', email || '', phone || '', address || '', true]);

    const row = res.rows[0];
    const vendor = {
      id: row.id,
      vendorCode: row.vendor_code,
      name: row.name,
      contactPerson: row.contact_person,
      email: row.email,
      phone: row.phone,
      address: row.address,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    return NextResponse.json({ data: vendor, message: 'Vendor created' }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating vendor:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, vendorCode, name, contactPerson, email, phone, address, isActive } = body;

    if (!id || !vendorCode || !name) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const res = await pool.query(`
      UPDATE vendors 
      SET vendor_code = $1, name = $2, contact_person = $3, email = $4, 
          phone = $5, address = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [vendorCode, name, contactPerson || '', email || '', phone || '', address || '', isActive !== undefined ? isActive : true, id]);

    if (res.rowCount === 0) {
      return NextResponse.json({ message: 'Vendor not found' }, { status: 404 });
    }

    return NextResponse.json({ data: res.rows[0], message: 'Vendor updated' }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating vendor:', error);
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
      return NextResponse.json({ message: 'Missing vendor ID(s)' }, { status: 400 });
    }

    const res = await pool.query(`DELETE FROM vendors WHERE id = ANY($1::uuid[]) RETURNING id`, [ids]);

    if (res.rowCount === 0) {
      return NextResponse.json({ message: 'No vendors found to delete' }, { status: 404 });
    }

    return NextResponse.json({ message: `Successfully deleted ${res.rowCount} vendor(s)`, count: res.rowCount }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting vendor(s):', error);
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}
