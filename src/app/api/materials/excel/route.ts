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

interface ParsedMaterialItem {
  rowIndex: number;
  code: string;
  name: string;
  category: string;
  uom: string;
  unitPrice: number;
  desc: string;
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
    const validItems: ParsedMaterialItem[] = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const rowIndex = i + 2;

      const rawCode = getValueByPossibleKeys(item, [
        'Material Code', 'Kode Material', 'Code', 'Kode', 'material_code', 'CODE', 'Item Code', 'Kode Barang'
      ]);
      const rawName = getValueByPossibleKeys(item, [
        'Material Name', 'Nama Material', 'Name', 'Nama', 'material_name', 'NAME', 'Nama Barang'
      ]);
      const rawCategory = getValueByPossibleKeys(item, [
        'Category', 'Kategori', 'Group', 'Grup', 'category', 'Kelompok'
      ]);
      const rawUom = getValueByPossibleKeys(item, [
        'UOM', 'Satuan', 'Unit', 'unit', 'uom'
      ]);
      const rawUnitPrice = getValueByPossibleKeys(item, [
        'Unit Price', 'Harga Satuan', 'Harga', 'Price', 'unit_price', 'Harga (Rp)'
      ]);
      const rawDesc = getValueByPossibleKeys(item, [
        'Description', 'Keterangan', 'Deskripsi', 'Specification', 'Spesifikasi', 'specification'
      ]);

      if (!rawCode || !rawName) {
        skippedCount++;
        errors.push(`Baris ${rowIndex}: Kode atau Nama material kosong`);
        continue;
      }

      const parsedPrice = rawUnitPrice ? (parseFloat(String(rawUnitPrice).replace(/[^0-9.-]+/g, '')) || 0) : 0;

      validItems.push({
        rowIndex,
        code: String(rawCode).trim(),
        name: String(rawName).trim(),
        category: rawCategory ? String(rawCategory).trim().toUpperCase() : 'OTHER',
        uom: rawUom ? String(rawUom).trim() : 'Pcs',
        unitPrice: parsedPrice,
        desc: rawDesc ? String(rawDesc).trim() : ''
      });
    }

    const BATCH_SIZE = 200;
    for (let b = 0; b < validItems.length; b += BATCH_SIZE) {
      const chunk = validItems.slice(b, b + BATCH_SIZE);

      const valueClauses: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      for (const item of chunk) {
        const id = generateId();
        valueClauses.push(
          `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}, $${paramIdx + 7}, $${paramIdx + 8})`
        );
        params.push(id, item.code, item.name, item.category, item.desc, item.uom, item.unitPrice, 0, true);
        paramIdx += 9;
      }

      const bulkQuery = `
        INSERT INTO material_masters (id, material_code, material_name, category, specification, unit, unit_price, minimum_stock, is_active)
        VALUES ${valueClauses.join(', ')}
        ON CONFLICT (material_code) 
        DO UPDATE SET
          material_name = EXCLUDED.material_name,
          category = EXCLUDED.category,
          specification = EXCLUDED.specification,
          unit = EXCLUDED.unit,
          unit_price = EXCLUDED.unit_price,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id;
      `;

      try {
        const res = await pool.query(bulkQuery, params);
        // Supabase PgBouncer (Vercel) fails with xmax=0, so we count them all as processed
        updatedCount += res.rowCount || chunk.length;
      } catch (err: any) {
        console.warn(`Batch query failed for chunk at offset ${b}, falling back to row-by-row:`, err.message);
        for (const item of chunk) {
          try {
            const id = generateId();
            const res = await pool.query(`
              INSERT INTO material_masters (id, material_code, material_name, category, specification, unit, unit_price, minimum_stock, is_active)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT (material_code) 
              DO UPDATE SET
                material_name = EXCLUDED.material_name,
                category = EXCLUDED.category,
                specification = EXCLUDED.specification,
                unit = EXCLUDED.unit,
                unit_price = EXCLUDED.unit_price,
                updated_at = CURRENT_TIMESTAMP
              RETURNING id;
            `, [id, item.code, item.name, item.category, item.desc, item.uom, item.unitPrice, 0, true]);

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
      const res = await pool.query('SELECT * FROM material_masters ORDER BY material_code ASC');
      wsData = res.rows.map(row => ({
        'Material Code': row.material_code,
        'Material Name': row.material_name,
        'Category': row.category,
        'UOM': row.unit,
        'Unit Price': parseFloat(row.unit_price) || 0,
        'Description': row.specification
      }));
    } else {
      // Template
      wsData = [{
        'Material Code': 'EXAMPLE-001',
        'Material Name': 'Example Item',
        'Category': 'CABLE',
        'UOM': 'Meter',
        'Unit Price': 15000,
        'Description': 'Example description'
      }];
    }

    const ws = xlsx.utils.json_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, 'Materials');
    
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = action === 'template' ? 'Materials_Template.xlsx' : 'Materials_Export.xlsx';

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
