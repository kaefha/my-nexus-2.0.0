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

interface ParsedVendorItem {
  rowIndex: number;
  vendorCode: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
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
    const validItems: ParsedVendorItem[] = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const rowIndex = i + 2;

      const rawVendorCode = getValueByPossibleKeys(item, ['Vendor Code', 'Kode Vendor', 'Code', 'Kode', 'vendor_code']);
      const rawName = getValueByPossibleKeys(item, ['Vendor Name', 'Nama Vendor', 'Name', 'Nama', 'name']);
      const rawContact = getValueByPossibleKeys(item, ['Contact Person', 'Kontak', 'PIC', 'contact_person']);
      const rawEmail = getValueByPossibleKeys(item, ['Email', 'Email Vendor', 'email']);
      const rawPhone = getValueByPossibleKeys(item, ['Phone', 'Telepon', 'No HP', 'phone']);
      const rawAddress = getValueByPossibleKeys(item, ['Address', 'Alamat', 'address']);
      const rawStatus = getValueByPossibleKeys(item, ['Status', 'status']);

      if (!rawVendorCode || !rawName) {
        skippedCount++;
        errors.push(`Baris ${rowIndex}: Kode atau Nama vendor kosong`);
        continue;
      }

      const isActive = rawStatus === 'Inactive' || rawStatus === 'Tidak Aktif' ? false : true;

      validItems.push({
        rowIndex,
        vendorCode: String(rawVendorCode).trim(),
        name: String(rawName).trim(),
        contactPerson: rawContact ? String(rawContact).trim() : '',
        email: rawEmail ? String(rawEmail).trim() : '',
        phone: rawPhone ? String(rawPhone).trim() : '',
        address: rawAddress ? String(rawAddress).trim() : '',
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
          `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}, $${paramIdx + 7})`
        );
        params.push(id, item.vendorCode, item.name, item.contactPerson, item.email, item.phone, item.address, item.isActive);
        paramIdx += 8;
      }

      const bulkQuery = `
        INSERT INTO vendors (id, vendor_code, name, contact_person, email, phone, address, is_active)
        VALUES ${valueClauses.join(', ')}
        ON CONFLICT (vendor_code) 
        DO UPDATE SET
          name = EXCLUDED.name,
          contact_person = EXCLUDED.contact_person,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          address = EXCLUDED.address,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
        RETURNING (xmax = 0) AS is_inserted;
      `;

      try {
        const res = await pool.query(bulkQuery, params);
        res.rows.forEach((row: any) => {
          if (row.is_inserted) {
            createdCount++;
          } else {
            updatedCount++;
          }
        });
      } catch (err: any) {
        console.warn(`Vendor batch query failed for chunk at offset ${b}, falling back to row-by-row:`, err.message);
        for (const item of chunk) {
          try {
            const id = generateId();
            const res = await pool.query(`
              INSERT INTO vendors (id, vendor_code, name, contact_person, email, phone, address, is_active)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (vendor_code) 
              DO UPDATE SET
                name = EXCLUDED.name,
                contact_person = EXCLUDED.contact_person,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                address = EXCLUDED.address,
                is_active = EXCLUDED.is_active,
                updated_at = CURRENT_TIMESTAMP
              RETURNING (xmax = 0) AS is_inserted;
            `, [id, item.vendorCode, item.name, item.contactPerson, item.email, item.phone, item.address, item.isActive]);

            if (res.rows[0]?.is_inserted) {
              createdCount++;
            } else {
              updatedCount++;
            }
          } catch (rowErr: any) {
            errors.push(`Baris ${item.rowIndex} (${item.vendorCode}): ${rowErr.message || 'Gagal diproses'}`);
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
      const res = await pool.query('SELECT * FROM vendors ORDER BY vendor_code ASC');
      wsData = res.rows.map(row => ({
        'Vendor Code': row.vendor_code,
        'Vendor Name': row.name,
        'Contact Person': row.contact_person,
        'Email': row.email,
        'Phone': row.phone,
        'Address': row.address,
        'Status': row.is_active ? 'Active' : 'Inactive'
      }));
    } else {
      wsData = [{
        'Vendor Code': 'VND-001',
        'Vendor Name': 'PT Example Vendor',
        'Contact Person': 'Budi Santoso',
        'Email': 'contact@example.com',
        'Phone': '021-1234567',
        'Address': 'Jl. Example No. 123',
        'Status': 'Active'
      }];
    }

    const ws = xlsx.utils.json_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, 'Vendors');
    
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = action === 'template' ? 'Vendors_Template.xlsx' : 'Vendors_Export.xlsx';

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
