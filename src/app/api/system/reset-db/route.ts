import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) DEFAULT 'USER',
        is_active BOOLEAN DEFAULT TRUE,
        password VARCHAR(255) DEFAULT '123',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY,
        project_code VARCHAR(100) UNIQUE,
        project_name VARCHAR(255) NOT NULL,
        customer VARCHAR(255),
        region VARCHAR(255),
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        pic VARCHAR(255),
        whatsapp_number VARCHAR(100),
        project_type VARCHAR(100) DEFAULT 'INTERNAL',
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS material_masters (
        id UUID PRIMARY KEY,
        material_code VARCHAR(100) UNIQUE NOT NULL,
        material_name TEXT NOT NULL,
        category TEXT,
        specification TEXT,
        unit VARCHAR(50),
        unit_price NUMERIC(15,2) DEFAULT 0,
        minimum_stock INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS rfcs (
        id UUID PRIMARY KEY,
        rfc_number VARCHAR(100) UNIQUE NOT NULL,
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        requestor_id UUID REFERENCES users(id) ON DELETE SET NULL,
        location TEXT,
        status VARCHAR(50) DEFAULT 'DRAFT',
        notes TEXT,
        request_document VARCHAR(500),
        signed_document VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS rfc_items (
        id UUID PRIMARY KEY,
        rfc_id UUID REFERENCES rfcs(id) ON DELETE CASCADE,
        material_id UUID REFERENCES material_masters(id) ON DELETE CASCADE,
        request_qty INTEGER NOT NULL,
        approved_qty INTEGER DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS purchase_orders (
        id UUID PRIMARY KEY,
        po_number VARCHAR(100) UNIQUE NOT NULL,
        vendor VARCHAR(255) NOT NULL,
        rfc_id UUID REFERENCES rfcs(id) ON DELETE SET NULL,
        expected_date TIMESTAMP,
        notes TEXT,
        status VARCHAR(50),
        items_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id UUID PRIMARY KEY,
        purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
        material_id UUID REFERENCES material_masters(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price DECIMAL(15,2),
        total_price DECIMAL(15,2),
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS delivery_orders (
        id UUID PRIMARY KEY,
        do_number VARCHAR(100) UNIQUE NOT NULL,
        project_id UUID,
        rfc_id UUID,
        po_id UUID,
        origin VARCHAR(255) NOT NULL,
        origin_lat NUMERIC(10, 8),
        origin_lng NUMERIC(11, 8),
        destination VARCHAR(255) NOT NULL,
        shipping_date TIMESTAMP,
        notes TEXT,
        status VARCHAR(50),
        evidence TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS delivery_order_items (
        id UUID PRIMARY KEY,
        delivery_order_id UUID REFERENCES delivery_orders(id) ON DELETE CASCADE,
        material_id UUID,
        quantity INTEGER,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS warehouses (
        id UUID PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS inventory_stocks (
        id UUID PRIMARY KEY,
        warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
        material_id UUID REFERENCES material_masters(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(warehouse_id, material_id)
      );

      CREATE TABLE IF NOT EXISTS transfers (
        id UUID PRIMARY KEY,
        transfer_number VARCHAR(100) UNIQUE NOT NULL,
        from_location VARCHAR(255) NOT NULL,
        to_location VARCHAR(255) NOT NULL,
        transfer_date TIMESTAMP,
        reason TEXT,
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS project_requirements (
        id UUID PRIMARY KEY,
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        material_id UUID REFERENCES material_masters(id) ON DELETE CASCADE,
        estimated_qty INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Safe ALTERS for existing tables that might be missing these columns
      ALTER TABLE material_masters ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15,2) DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_code VARCHAR(50) UNIQUE;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type VARCHAR(50) DEFAULT 'INTERNAL';
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
      ALTER TABLE rfcs ADD COLUMN IF NOT EXISTS request_date TIMESTAMP;
      ALTER TABLE rfcs ADD COLUMN IF NOT EXISTS site_approver_id UUID;
      ALTER TABLE rfcs ADD COLUMN IF NOT EXISTS finance_approver_id UUID;
      
      -- PO missing columns
      ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS transporter VARCHAR(255);
      ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS driver_name VARCHAR(255);
      ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(100);
      ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS deliver_to VARCHAR(500);
      ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS signed_document_url VARCHAR(500);
      ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approver_id UUID;
    `;
    
    await client.query(sql);
    
    return NextResponse.json({ 
      status: 'SUCCESS',
      message: 'All tables and missing columns successfully initialized on Vercel database!' 
    });
  } catch (error: any) {
    console.error('Init Error:', error);
    return NextResponse.json({ status: 'ERROR', message: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
