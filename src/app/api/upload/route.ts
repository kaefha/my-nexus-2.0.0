import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename while keeping extension
    const extension = file.name.split('.').pop() || 'pdf';
    const filename = `${uuidv4()}.${extension}`;
    
    // 1. Try Supabase Storage if configured
    if (supabase) {
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filename, buffer, {
          contentType: file.type || 'application/pdf',
          upsert: false
        });
        
      if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Supabase upload failed: ${error.message || JSON.stringify(error)}`);
      }
      
      const { data: publicUrlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filename);
        
      return NextResponse.json({ 
        message: 'File uploaded successfully to Supabase',
        url: publicUrlData.publicUrl
      }, { status: 200 });
    }
    
    // 2. Fallback to Local Storage if Supabase is not configured
    const uploadDir = join(process.cwd(), 'public/uploads');
    const filepath = join(uploadDir, filename);
    
    await writeFile(filepath, buffer);
    
    const fileUrl = `/uploads/${filename}`;
    
    return NextResponse.json({ 
      message: 'File uploaded successfully locally (fallback)',
      url: fileUrl
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ message: 'Failed to upload file', error: error.message || String(error) }, { status: 500 });
  }
}
