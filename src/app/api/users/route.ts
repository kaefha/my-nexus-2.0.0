import { NextResponse } from 'next/server';
import { pool, generateId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const res = await pool.query(`SELECT id, name, email, role, is_active as "isActive", password FROM users ORDER BY name ASC`);
    return NextResponse.json({ data: res.rows }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, role, isActive } = body;

    if (!name || !email) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const id = generateId();

    const res = await pool.query(`
      INSERT INTO users (id, name, email, role, is_active, password)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, name, email, role || 'USER', isActive !== undefined ? isActive : true, body.password || '123']);

    const row = res.rows[0];
    const user = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      isActive: row.is_active,
    };

    return NextResponse.json({ data: user, message: 'User created' }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, email, role, isActive, password } = body;

    if (!id) {
      return NextResponse.json({ message: 'Missing user id' }, { status: 400 });
    }

    const updates = [];
    const values = [];
    let counter = 1;

    if (name !== undefined) { updates.push(`name = $${counter++}`); values.push(name); }
    if (email !== undefined) { updates.push(`email = $${counter++}`); values.push(email); }
    if (role !== undefined) { updates.push(`role = $${counter++}`); values.push(role); }
    if (isActive !== undefined) { updates.push(`is_active = $${counter++}`); values.push(isActive); }
    if (password !== undefined) { updates.push(`password = $${counter++}`); values.push(password); }

    if (updates.length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const res = await pool.query(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${counter}
      RETURNING *
    `, values);

    if (res.rowCount === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data: res.rows[0], message: 'User updated' }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating user:', error);
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
      return NextResponse.json({ message: 'Missing user ID(s)' }, { status: 400 });
    }

    const res = await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[]) RETURNING id`, [ids]);

    if (res.rowCount === 0) {
      return NextResponse.json({ message: 'No users found to delete' }, { status: 404 });
    }

    return NextResponse.json({ message: `Successfully deleted ${res.rowCount} user(s)`, count: res.rowCount }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting user(s):', error);
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}
