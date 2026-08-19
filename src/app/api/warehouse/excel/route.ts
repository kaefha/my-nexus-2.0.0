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

interface ParsedWarehouseItem {
  rowIndex: number;
  code: string;
  name: string;
  location: string;
  coordinates: string;
  type: string;
  capacity: string;
  status: string;
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
    const validItems: ParsedWarehouseItem[] = [];

    // Pre-validate items
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const rowIndex = i + 2;

      const rawCode = getValueByPossibleKeys(item, ['Code', 'Kode', 'Warehouse Code', 'Kode Gudang', 'code']);
      const rawName = getValueByPossibleKeys(item, ['Name', 'Nama', 'Warehouse Name', 'Nama Gudang', 'name']);
      const rawLocation = getValueByPossibleKeys(item, ['Location', 'Lokasi', 'Alamat', 'location']);
      const rawCoordinates = getValueByPossibleKeys(item, ['Coordinates', 'Koordinat', 'coordinates']);
      const rawType = getValueByPossibleKeys(item, ['Type', 'Tipe', 'Jenis', 'type']);
      const rawCapacity = getValueByPossibleKeys(item, ['Capacity', 'Kapasitas', 'capacity']);
      const rawStatus = getValueByPossibleKeys(item, ['Status', 'Status Gudang', 'status']);

      if (!rawCode || !rawName) {
        skippedCount++;
        errors.push(`Baris ${rowIndex}: Kode atau Nama gudang kosong`);
        continue;
      }

      validItems.push({
        rowIndex,
        code: String(rawCode).trim(),
        name: String(rawName).trim(),
        location: rawLocation ? String(rawLocation).trim() : '',
        coordinates: rawCoordinates ? String(rawCoordinates).trim() : '',
        type: rawType ? String(rawType).trim().toUpperCase() : 'MAIN',
        capacity: rawCapacity ? String(rawCapacity).trim() : '',
        status: rawStatus ? String(rawStatus).trim().toUpperCase() : 'ACTIVE'
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
          `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}, $${paramIdx + 7})`
        );
        params.push(id, item.code, item.name, item.location, item.coordinates, item.type, item.capacity, item.status);
        paramIdx += 8;
      }

      const bulkQuery = `
        INSERT INTO warehouses (id, code, name, location, coordinates, type, capacity, status)
        VALUES ${valueClauses.join(', ')}
        ON CONFLICT (code) 
        DO UPDATE SET
          name = EXCLUDED.name,
          location = EXCLUDED.location,
          coordinates = EXCLUDED.coordinates,
          type = EXCLUDED.type,
          capacity = EXCLUDED.capacity,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id;
      `;

      try {
        const res = await pool.query(bulkQuery, params);
        updatedCount += res.rowCount || chunk.length;
      } catch (err: any) {
        console.warn(`Warehouse batch query failed for chunk at offset ${b}, falling back to row-by-row:`, err.message);
        for (const item of chunk) {
          try {
            const id = generateId();
            const res = await pool.query(`
              INSERT INTO warehouses (id, code, name, location, coordinates, type, capacity, status)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (code) 
              DO UPDATE SET
                name = EXCLUDED.name,
                location = EXCLUDED.location,
                coordinates = EXCLUDED.coordinates,
                type = EXCLUDED.type,
                capacity = EXCLUDED.capacity,
                status = EXCLUDED.status,
                updated_at = CURRENT_TIMESTAMP
              RETURNING id;
            `, [id, item.code, item.name, item.location, item.coordinates, item.type, item.capacity, item.status]);

            if (res.rowCount && res.rowCount > 0) {
              updatedCount++;
            }
          } catch (rowErr: any) {
            errors.push(`Baris ${item.rowIndex} (${item.code}): ${rowErr.message || 'Gagal diproses'}`);
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
      const res = await pool.query('SELECT * FROM warehouses ORDER BY code ASC');
      wsData = res.rows.map(row => ({
        'Code': row.code,
        'Name': row.name,
        'Location': row.location,
        'Coordinates': row.coordinates,
        'Type': row.type,
        'Capacity': row.capacity,
        'Status': row.status
      }));
    } else {
      wsData = [{
        'Code': 'WH-JKT-01',
        'Name': 'Jakarta Main Warehouse',
        'Location': 'Jl. Sudirman No. 123',
        'Coordinates': '-6.2234, 106.8463',
        'Type': 'MAIN',
        'Capacity': '5000',
        'Status': 'ACTIVE'
      }];
    }

    const ws = xlsx.utils.json_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, 'Warehouses');
    
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = action === 'template' ? 'Warehouses_Template.xlsx' : 'Warehouses_Export.xlsx';

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
