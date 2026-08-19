import { NextResponse } from 'next/server';
import { pool, generateId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').toLowerCase();
    const group = searchParams.get('group') || '';
    const uom = searchParams.get('uom') || '';
    const sort = searchParams.get('sort') || '';
    
    let queryStr = 'SELECT * FROM material_masters WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      queryStr += ` AND (LOWER(material_code) LIKE $${paramIndex} OR LOWER(material_name) LIKE $${paramIndex} OR LOWER(category) LIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (group && group !== 'ALL') {
      queryStr += ` AND category = $${paramIndex}`;
      queryParams.push(group);
      paramIndex++;
    }

    if (uom && uom !== 'ALL') {
      queryStr += ` AND unit = $${paramIndex}`;
      queryParams.push(uom);
      paramIndex++;
    }

    if (sort === 'group-asc') {
      queryStr += ' ORDER BY category ASC, material_name ASC';
    } else if (sort === 'group-desc') {
      queryStr += ' ORDER BY category DESC, material_name ASC';
    } else if (sort === 'uom-asc') {
      queryStr += ' ORDER BY unit ASC, material_name ASC';
    } else if (sort === 'uom-desc') {
      queryStr += ' ORDER BY unit DESC, material_name ASC';
    } else {
      queryStr += ' ORDER BY material_name ASC';
    }
    
    const res = await pool.query(queryStr, queryParams);
    
    const materials = res.rows.map((row: any) => ({
      id: row.id,
      materialCode: row.material_code,
      materialName: row.material_name,
      category: row.category,
      specification: row.specification,
      unit: row.unit,
      unitPrice: parseFloat(row.unit_price) || 0,
      minimumStock: row.minimum_stock,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({ data: materials }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching materials:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, group, uom, description, category, unitPrice, price } = body;

    if (!code || !name || !uom) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const id = generateId();
    const materialCode = code;
    const materialName = name;
    const resolvedCategory = group || category || 'STANDARD';
    const specification = description || '';
    const unit = uom;
    const parsedUnitPrice = parseFloat(unitPrice !== undefined ? unitPrice : (price !== undefined ? price : 0)) || 0;

    const res = await pool.query(`
      INSERT INTO material_masters (id, material_code, material_name, category, specification, unit, unit_price, minimum_stock, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [id, materialCode, materialName, resolvedCategory, specification, unit, parsedUnitPrice, 0, true]);

    const row = res.rows[0];
    const material = {
      id: row.id,
      materialCode: row.material_code,
      materialName: row.material_name,
      category: row.category,
      specification: row.specification,
      unit: row.unit,
      unitPrice: parseFloat(row.unit_price) || 0,
      minimumStock: row.minimum_stock,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    return NextResponse.json({ data: material, message: 'Material created' }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating material:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, materialCode, materialName, category, specification, unit, unitPrice, price, minimumStock, isActive } = body;

    if (!id || !materialCode || !materialName) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const parsedUnitPrice = parseFloat(unitPrice !== undefined ? unitPrice : (price !== undefined ? price : 0)) || 0;

    const res = await pool.query(`
      UPDATE material_masters 
      SET material_code = $1, material_name = $2, category = $3, specification = $4, 
          unit = $5, unit_price = $6, minimum_stock = $7, is_active = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [materialCode, materialName, category || '', specification || '', unit || '', parsedUnitPrice, minimumStock || 0, isActive !== undefined ? isActive : true, id]);

    if (res.rowCount === 0) {
      return NextResponse.json({ message: 'Material not found' }, { status: 404 });
    }

    const row = res.rows[0];
    return NextResponse.json({ 
      data: {
        ...row,
        unitPrice: parseFloat(row.unit_price) || 0
      }, 
      message: 'Material updated' 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating material:', error);
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
      return NextResponse.json({ message: 'Missing material ID(s)' }, { status: 400 });
    }

    const res = await pool.query(
      `DELETE FROM material_masters WHERE id = ANY($1::uuid[]) RETURNING id`,
      [ids]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ message: 'No materials found to delete' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: `Successfully deleted ${res.rowCount} material(s)`, 
      count: res.rowCount 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting material(s):', error);
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}
