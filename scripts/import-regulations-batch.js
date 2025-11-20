// Import regulations - Optimized batch version
import XLSX from 'xlsx';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

function parseKoreanDate(dateStr) {
  if (!dateStr) return null;
  const cleaned = dateStr.replace(/\./g, '').trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length < 3) return null;
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

function mapRegulationType(type) {
  return (type === '조례') ? '조례' : '규칙';
}

async function importBatch() {
  console.log('📄 Reading Excel file...\n');
  
  const workbook = XLSX.readFile('/home/user/uploaded_files/자치법규목록 (1).xls');
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  
  // Check existing count
  const existing = await sql`SELECT COUNT(*) as count FROM local_regulations`;
  console.log(`📊 Existing regulations: ${existing[0].count}`);
  console.log(`📊 Total to import: ${data.length}`);
  console.log(`📊 Remaining: ${data.length - existing[0].count}\n`);
  
  // Start from where we left off
  const startIndex = parseInt(existing[0].count);
  
  if (startIndex >= data.length) {
    console.log('✅ All regulations already imported!');
    return;
  }
  
  console.log(`🚀 Starting batch import from index ${startIndex}...\n`);
  
  const BATCH_SIZE = 50;
  let imported = 0;
  
  for (let i = startIndex; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, Math.min(i + BATCH_SIZE, data.length));
    
    try {
      // Build batch insert query
      const values = batch.map((row, idx) => {
        const regulation_id = `reg_gangnam_${i + idx + 1}_${Date.now()}_${idx}`;
        const regulation_name = row['법령명'];
        const local_gov = '서울특별시 강남구';
        const local_gov_code = '11680';
        const regulation_type = mapRegulationType(row['법령종류']);
        const enactment_date = parseKoreanDate(row['공포일자']);
        const current_version = row['공포번호'] || 'v1.0';
        const department = row['부서'] || '';
        const status = '시행';
        
        return {
          regulation_id,
          regulation_type,
          regulation_name,
          local_gov,
          local_gov_code,
          enactment_date,
          current_version,
          department,
          status
        };
      }).filter(v => v.regulation_name && v.enactment_date);
      
      // Insert batch
      for (const v of values) {
        await sql`
          INSERT INTO local_regulations (
            regulation_id, regulation_type, regulation_name, 
            local_gov, local_gov_code, enactment_date, 
            current_version, department, status
          ) VALUES (
            ${v.regulation_id}, ${v.regulation_type}, ${v.regulation_name},
            ${v.local_gov}, ${v.local_gov_code}, ${v.enactment_date},
            ${v.current_version}, ${v.department}, ${v.status}
          )
        `;
      }
      
      imported += values.length;
      console.log(`✓ Imported ${startIndex + imported}/${data.length} regulations...`);
      
    } catch (error) {
      console.error(`❌ Batch error:`, error.message);
    }
  }
  
  console.log('\n✅ Import complete!');
  
  // Final verification
  const final = await sql`SELECT COUNT(*) as count FROM local_regulations`;
  console.log(`📈 Total regulations in database: ${final[0].count}`);
}

importBatch().catch(console.error);
