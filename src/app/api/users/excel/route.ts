import { NextRequest, NextResponse } from 'next/server';
import { pool, generateId } from '@/lib/db';
import * as xlsx from 'xlsx';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getValueByPossibleKeys(item: Record<string, any>, possibleKeys: string[]): any {
  for (const key of possibleKeys) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
      return item[key];
    }
  }
  const itemKeys = Object.keys(item);
  for (const pKey of possibleKeys) {
    const matchedKey = itemKeys.find(k => k.trim().toLowerCase() === pKey.trim().toLowerCase());
    if (matchedKey && item[matchedKey] !== undefined && item[matchedKey] !== null && item[matchedKey] !== '') {
      return item[matchedKey];
    }
  }
  return undefined;
}

interface ParsedUserItem {
  rowIndex: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return NextResponse.json({ message: 'Empty excel file' }, { status: 400 });
    }

    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    const data = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet);

    if (!data || data.length === 0) {
      return NextResponse.json({ message: 'No data rows found in the Excel sheet' }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const validItems: ParsedUserItem[] = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const rowIndex = i + 2;

      const rawEmail = getValueByPossibleKeys(item, ['Email', 'Alamat Email', 'email']);
      const rawName = getValueByPossibleKeys(item, ['Name', 'Nama', 'Nama Lengkap', 'name']);
      const rawRole = getValueByPossibleKeys(item, ['Role', 'Peran', 'Jabatan', 'role']);
      const rawStatus = getValueByPossibleKeys(item, ['Status', 'status']);

      if (!rawEmail || !rawName) {
        skippedCount++;
        errors.push(`Baris ${rowIndex}: Email atau Nama user kosong`);
        continue;
      }

      const isActive = rawStatus === 'Inactive' || rawStatus === 'Tidak Aktif' ? false : true;

      validItems.push({
        rowIndex,
        email: String(rawEmail).trim().toLowerCase(),
        name: String(rawName).trim(),
        role: rawRole ? String(rawRole).trim().toUpperCase() : 'USER',
        isActive
      });
    }

    // Chunked Batch Upsert (200 per batch)
    const BATCH_SIZE = 200;
    for (let b = 0; b < validItems.length; b += BATCH_SIZE) {
      const chunk = validItems.slice(b, b + BATCH_SIZE);

      const valueClauses: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      for (const item of chunk) {
        const id = generateId();
        valueClauses.push(
          `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, '123')`
        );
        params.push(id, item.email, item.name, item.role, item.isActive);
        paramIdx += 5;
      }

      const bulkQuery = `
        INSERT INTO users (id, email, name, role, is_active, password)
        VALUES ${valueClauses.join(', ')}
        ON CONFLICT (email) 
        DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id;
      `;

      try {
        const res = await pool.query(bulkQuery, params);
        updatedCount += res.rowCount || chunk.length;
      } catch (err: any) {
        console.warn(`User batch query failed for chunk at offset ${b}, falling back to row-by-row:`, err.message);
        for (const item of chunk) {
          try {
            const id = generateId();
            const res = await pool.query(`
              INSERT INTO users (id, email, name, role, is_active, password)
              VALUES ($1, $2, $3, $4, $5, '123')
              ON CONFLICT (email) 
              DO UPDATE SET
                name = EXCLUDED.name,
                role = EXCLUDED.role,
                is_active = EXCLUDED.is_active,
                updated_at = CURRENT_TIMESTAMP
              RETURNING id;
            `, [id, item.email, item.name, item.role, item.isActive]);

            if (res.rowCount && res.rowCount > 0) {
              updatedCount++;
            }
          } catch (rowErr: any) {
            errors.push(`Baris ${item.rowIndex} (${item.email}): ${rowErr.message || 'Gagal diproses'}`);
          }
        }
      }
    }

    const totalProcessed = createdCount + updatedCount;

    return NextResponse.json({
      message: 'Success',
      count: totalProcessed,
      createdCount,
      updatedCount,
      skippedCount,
      errors: errors.length > 0 ? errors : undefined
    }, { status: 200 });

  } catch (error: any) {
    console.error('Excel import error:', error);
    return NextResponse.json({ 
      message: error?.message ? `Import gagal: ${error.message}` : 'Format file Excel tidak valid atau gagal dibaca' 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    const wb = xlsx.utils.book_new();
    let wsData: any[] = [];

    if (action === 'export') {
      const res = await pool.query('SELECT * FROM users ORDER BY name ASC');
      wsData = res.rows.map(row => ({
        'Name': row.name,
        'Email': row.email,
        'Role': row.role,
        'Status': row.is_active ? 'Active' : 'Inactive'
      }));
    } else {
      wsData = [{
        'Name': 'John Doe',
        'Email': 'john@example.com',
        'Role': 'USER',
        'Status': 'Active'
      }];
    }

    const ws = xlsx.utils.json_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, 'Users');
    
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = action === 'template' ? 'Users_Template.xlsx' : 'Users_Export.xlsx';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error: any) {
    console.error('Excel export error:', error);
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}
