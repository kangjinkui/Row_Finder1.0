// Crawl laws from 법제처 API
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
const LAW_API_KEY = process.env.MOLEG_API_KEY;
const LAW_API_BASE = process.env.MOLEG_API_BASE_URL;

const sql = neon(DATABASE_URL);

// Key law categories related to local regulations
const KEY_LAWS = [
  '지방자치법',
  '지방재정법',
  '지방세법',
  '지방공무원법',
  '지방교육자치에 관한 법률',
  '주민소환에 관한 법률',
  '공유재산 및 물품 관리법',
  '지방공기업법',
  '지방자치단체를 당사자로 하는 계약에 관한 법률',
  '지방자치단체 출자·출연 기관의 운영에 관한 법률'
];

async function searchLaw(lawName) {
  try {
    const url = `${LAW_API_BASE}/lawSearch.do?OC=${LAW_API_KEY}&target=law&type=XML&query=${encodeURIComponent(lawName)}`;
    
    console.log(`🔍 Searching: ${lawName}`);
    
    const response = await fetch(url);
    const xmlText = await response.text();
    
    // Parse XML (simple extraction)
    const lawMatches = xmlText.match(/<law id="\d+">(.*?)<\/law>/gs);
    
    if (!lawMatches || lawMatches.length === 0) {
      console.log(`   ❌ No results found`);
      return null;
    }
    
    // Get first match
    const lawXML = lawMatches[0];
    
    const extractField = (xml, field) => {
      // Handle CDATA sections
      const cdataMatch = xml.match(new RegExp(`<${field}><\\!\\[CDATA\\[(.*?)\\]\\]><\\/${field}>`, 's'));
      if (cdataMatch) return cdataMatch[1].trim();
      
      // Normal extraction
      const match = xml.match(new RegExp(`<${field}>(.*?)<\\/${field}>`, 's'));
      return match ? match[1].trim() : '';
    };
    
    const law_id = extractField(lawXML, '법령일련번호');
    const law_name = extractField(lawXML, '법령명한글');
    const law_number = extractField(lawXML, '법령번호');
    const law_type_raw = extractField(lawXML, '법령구분명');
    const enactment_date_raw = extractField(lawXML, '공포일자') || extractField(lawXML, '제정일자');
    const ministry = extractField(lawXML, '소관부처명');
    
    // Map law type
    let law_type = '법률';
    if (law_type_raw.includes('대통령령') || law_type_raw.includes('시행령')) {
      law_type = '시행령';
    } else if (law_type_raw.includes('부령') || law_type_raw.includes('시행규칙')) {
      law_type = '시행규칙';
    }
    
    // Parse date (YYYYMMDD)
    let enactment_date = new Date();
    if (enactment_date_raw && enactment_date_raw.length >= 8) {
      const year = parseInt(enactment_date_raw.substring(0, 4));
      const month = parseInt(enactment_date_raw.substring(4, 6)) - 1;
      const day = parseInt(enactment_date_raw.substring(6, 8));
      enactment_date = new Date(year, month, day);
    }
    
    console.log(`   ✓ Found: ${law_name} (${law_id})`);
    
    return {
      law_id,
      law_name,
      law_number: law_number || 'N/A',
      law_type,
      enactment_date,
      current_version: 'v1.0',
      status: '시행',
      ministry: ministry || '',
      category: '지방자치'
    };
    
  } catch (error) {
    console.error(`   ❌ Error searching ${lawName}:`, error.message);
    return null;
  }
}

async function saveLaw(lawData) {
  try {
    // Check if already exists
    const existing = await sql`
      SELECT law_id FROM laws WHERE law_id = ${lawData.law_id}
    `;
    
    if (existing.length > 0) {
      console.log(`   ⚠️  Already exists: ${lawData.law_name}`);
      return false;
    }
    
    // Insert
    await sql`
      INSERT INTO laws (
        law_id, law_type, law_name, law_number, enactment_date,
        current_version, status, ministry, category
      ) VALUES (
        ${lawData.law_id}, ${lawData.law_type}, ${lawData.law_name},
        ${lawData.law_number}, ${lawData.enactment_date}, ${lawData.current_version},
        ${lawData.status}, ${lawData.ministry}, ${lawData.category}
      )
    `;
    
    console.log(`   ✅ Saved: ${lawData.law_name}`);
    return true;
    
  } catch (error) {
    console.error(`   ❌ Error saving:`, error.message);
    return false;
  }
}

async function crawlKeyLaws() {
  console.log('🚀 Starting law crawl...\n');
  console.log(`📋 Target laws: ${KEY_LAWS.length}\n`);
  
  let searched = 0;
  let saved = 0;
  let skipped = 0;
  
  for (const lawName of KEY_LAWS) {
    const lawData = await searchLaw(lawName);
    searched++;
    
    if (lawData) {
      const success = await saveLaw(lawData);
      if (success) saved++;
      else skipped++;
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Crawl Summary:');
  console.log(`🔍 Searched: ${searched}`);
  console.log(`✅ Saved: ${saved}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log('='.repeat(50));
  
  // Verify
  const count = await sql`SELECT COUNT(*) as count FROM laws`;
  console.log(`\n📈 Total laws in database: ${count[0].count}`);
}

crawlKeyLaws().catch(console.error);
