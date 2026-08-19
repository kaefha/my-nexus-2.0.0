const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Create test excel file with 500 items
const items = [];
for (let i = 1; i <= 500; i++) {
  items.push({
    'Kode Material': `TEST-MAT-${String(i).padStart(4, '0')}`,
    'Nama Material': `Material Pengujian Kinerja Tinggi Nomor ${i} dengan Deskripsi Panjang untuk Memastikan Tidak Ada Error`,
    'Kategori': i % 2 === 0 ? 'CABLE' : 'PASSIVE_DEVICE',
    'Satuan': 'Meter',
    'Keterangan': `Spesifikasi detail material pengujian ke-${i} dengan teks panjang untuk verifikasi line clamp dan database TEXT column type.`
  });
}

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(items);
xlsx.utils.book_append_sheet(wb, ws, 'Materials');

const filePath = path.join(__dirname, 'test-500-materials.xlsx');
xlsx.writeFile(wb, filePath);
console.log(`Generated test excel file at ${filePath} with ${items.length} rows.`);
