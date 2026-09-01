import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

async function initSettingsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(255) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function GET() {
  try {
    await initSettingsTable();
    const result = await pool.query('SELECT key, value FROM settings');
    const settings = result.rows.reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    
    // Default values
    if (!settings.ppn) settings.ppn = '11';
    if (!settings.dp) settings.dp = '30';
    
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    await initSettingsTable();
    
    // UPSERT entries
    const keys = Object.keys(data);
    for (const key of keys) {
      const val = String(data[key]);
      await pool.query(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE 
        SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
      `, [key, val]);
    }
    
    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (error: any) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ success: false, message: 'Failed to save settings' }, { status: 500 });
  }
}
