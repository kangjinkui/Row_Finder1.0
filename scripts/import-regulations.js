// Import regulations from Excel to Neon database
import XLSX from 'xlsx';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Parse date string "2024. 5. 17." to Date
function parseKoreanDate(dateStr) {
  if (!dateStr) return null;
  
  // Remove dots and extra spaces
  const cleaned = dateStr.replace(/\./g, '').trim();
  const parts = cleaned.split(/\s+/);
  
  if (parts.length < 3) return null;
  
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
  const day = parseInt(parts[2]);
  
  return new Date(year, month, day);
}

// Map 제정·개정구분 to database enum
function mapRevisionType(type) {
  if (type === '제정') return '신규';
  if (type === '일부개정') return '일부개정';
  if (type === '전부개정') return '전부개정';
  if (type === '폐지') return '폐지';
  return '일부개정'; // default
}

// Map 법령종류 to database enum
function mapRegulationType(type) {
  if (type === '조례') return '조례';
  if (type === '규칙') return '규칙';
  return '조례'; // default
}

async function importRegulations() {
  console.log('📄 Reading Excel file...\n');
  
  const filePath = '/home/user/uploaded_files/자치법규목록 (1).xls';
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`📊 Total records to import: ${data.length}\n`);
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    try {
      const regulation_id = `reg_gangnam_${i + 1}_${Date.now()}`;
      const regulation_name = row['법령명'];
      const local_gov = row['지역명'] || '서울특별시 강남구';
      const local_gov_code = '11680'; // 강남구 행정구역코드
      const regulation_type = mapRegulationType(row['법령종류']);
      const enactment_date = parseKoreanDate(row['공포일자']);
      const current_version = row['공포번호'] || 'v1.0';
      const department = row['부서'] || '';
      const status = '시행'; // All are active
      
      if (!regulation_name || !enactment_date) {
        console.log(`⚠️  Skipping row ${i + 1}: Missing required fields`);
        skipped++;
        continue;
      }
      
      // Insert into database
      await sql`
        INSERT INTO local_regulations (
          regulation_id, regulation_type, regulation_name, 
          local_gov, local_gov_code, enactment_date, 
          current_version, department, status
        ) VALUES (
          ${regulation_id}, ${regulation_type}, ${regulation_name},
          ${local_gov}, ${local_gov_code}, ${enactment_date},
          ${current_version}, ${department}, ${status}
        )
      `;
      
      imported++;
      
      if (imported % 50 === 0) {
        console.log(`✓ Imported ${imported}/${data.length} regulations...`);
      }
      
    } catch (error) {
      console.error(`❌ Error importing row ${i + 1}:`, error.message);
      errors++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Import Summary:');
  console.log(`✅ Successfully imported: ${imported}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log('='.repeat(50));
  
  // Verify import
  console.log('\n🔍 Verifying data...');
  const count = await sql`SELECT COUNT(*) as count FROM local_regulations`;
  console.log(`📈 Total regulations in database: ${count[0].count}`);
  
  // Show sample
  const samples = await sql`
    SELECT regulation_name, regulation_type, department, enactment_date 
    FROM local_regulations 
    ORDER BY enactment_date DESC 
    LIMIT 5
  `;
  
  console.log('\n📝 Sample records:');
  samples.forEach((reg, idx) => {
    console.log(`${idx + 1}. ${reg.regulation_name} (${reg.regulation_type})`);
    console.log(`   부서: ${reg.department}`);
    console.log(`   제정일: ${reg.enactment_date.toISOString().split('T')[0]}`);
  });
}

// Run import
importRegulations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
