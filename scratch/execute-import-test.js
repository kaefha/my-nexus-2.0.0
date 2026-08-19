const fs = require('fs');
const path = require('path');
const https = require('https');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const filePath = path.join(__dirname, 'test-500-materials.xlsx');
const fileBuffer = fs.readFileSync(filePath);

function sendImportRequest() {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="test-500-materials.xlsx"\r\n`;
    body += `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`;

    const bodyHeader = Buffer.from(body, 'utf-8');
    const bodyFooter = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    const payload = Buffer.concat([bodyHeader, fileBuffer, bodyFooter]);

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/materials/excel',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payload.length
      }
    };

    const startTime = Date.now();
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          duration,
          data: JSON.parse(responseData)
        });
      });
    });

    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

async function runBenchmark() {
  console.log('🚀 Running Benchmark Test: 500 Materials Import\n');
  
  // Pass 1: Initial Insert
  console.log('--- Pass 1: Inserting 500 New Materials ---');
  const res1 = await sendImportRequest();
  console.log(`⏱️ Duration: ${res1.duration} ms (${(res1.duration / 1000).toFixed(2)} seconds)`);
  console.log(`📦 Status: ${res1.statusCode} | Result:`, res1.data);

  console.log('\n--- Pass 2: Re-importing Same 500 Materials (Testing Upsert Update) ---');
  const res2 = await sendImportRequest();
  console.log(`⏱️ Duration: ${res2.duration} ms (${(res2.duration / 1000).toFixed(2)} seconds)`);
  console.log(`📦 Status: ${res2.statusCode} | Result:`, res2.data);

  // Clean up
  const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase') || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });
  
  const cleanRes = await pool.query("DELETE FROM material_masters WHERE material_code LIKE 'TEST-MAT-%'");
  console.log(`\n🧹 Cleaned up ${cleanRes.rowCount} benchmark test records from database.`);
  await pool.end();
  console.log('\n✅ BENCHMARK COMPLETED SUCCESSFULLY!');
}

runBenchmark().catch(console.error);
