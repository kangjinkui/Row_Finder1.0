// Crawl law articles from 법제처 API
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
const LAW_API_KEY = process.env.MOLEG_API_KEY;
const LAW_API_BASE = process.env.MOLEG_API_BASE_URL;

const sql = neon(DATABASE_URL);

// Extract text from CDATA
function extractCDATA(text) {
  if (!text) return '';
  const match = text.match(/<!\[CDATA\[(.*?)\]\]>/s);
  return match ? match[1].trim() : text.trim();
}

// Parse article XML
function parseArticleXML(articleXML) {
  const extractField = (xml, field) => {
    const match = xml.match(new RegExp(`<${field}>(.*?)<\\/${field}>`, 's'));
    return match ? extractCDATA(match[1]) : '';
  };
  
  const article_number = extractField(articleXML, '조문번호');
  const article_title = extractField(articleXML, '조문제목');
  const article_type_raw = extractField(articleXML, '조문여부');
  
  // Get content - may have nested structure
  let article_content = extractField(articleXML, '조문내용');
  
  // Check for 항/호 (paragraphs/items)
  const paragraphs = articleXML.match(/<항>(.*?)<\/항>/gs);
  if (paragraphs && paragraphs.length > 0) {
    const paragraphTexts = paragraphs.map(p => extractCDATA(p));
    article_content = paragraphTexts.join('\n');
  }
  
  // Map article type
  let article_type = '본문';
  if (article_type_raw === '부칙' || article_content.includes('부칙')) {
    article_type = '부칙';
  } else if (article_type_raw === '별표' || article_content.includes('별표')) {
    article_type = '별표';
  }
  
  return {
    article_number,
    article_title,
    article_content,
    article_type
  };
}

async function fetchLawArticles(law_id, lawMST) {
  try {
    const url = `${LAW_API_BASE}/lawService.do?OC=${LAW_API_KEY}&target=law&type=XML&MST=${lawMST}`;
    
    console.log(`📥 Fetching articles for law ${law_id}...`);
    
    const response = await fetch(url);
    const xmlText = await response.text();
    
    // Extract articles
    const articleMatches = xmlText.match(/<조문단위 조문키="[^"]+?">(.*?)<\/조문단위>/gs);
    
    if (!articleMatches || articleMatches.length === 0) {
      console.log(`   ⚠️  No articles found`);
      return [];
    }
    
    const articles = [];
    
    for (const articleXML of articleMatches) {
      try {
        const parsed = parseArticleXML(articleXML);
        
        // Skip if no content
        if (!parsed.article_content || parsed.article_content.length < 10) {
          continue;
        }
        
        // Skip chapter/section headers
        if (parsed.article_content.includes('제') && parsed.article_content.includes('장')) {
          continue;
        }
        if (parsed.article_content.includes('제') && parsed.article_content.includes('절')) {
          continue;
        }
        
        articles.push(parsed);
      } catch (error) {
        console.error(`   ⚠️  Error parsing article:`, error.message);
      }
    }
    
    console.log(`   ✓ Extracted ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error(`   ❌ Error fetching articles:`, error.message);
    return [];
  }
}

async function saveArticles(law_id, revision_id, articles) {
  let saved = 0;
  let skipped = 0;
  
  for (const article of articles) {
    try {
      const article_id = `${law_id}_art_${article.article_number}_${Date.now()}_${saved}`;
      
      await sql`
        INSERT INTO articles (
          article_id, law_id, revision_id, article_number,
          article_title, article_content, article_type
        ) VALUES (
          ${article_id}, ${law_id}, ${revision_id}, ${article.article_number},
          ${article.article_title}, ${article.article_content}, ${article.article_type}
        )
      `;
      
      saved++;
    } catch (error) {
      // Skip duplicates
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        skipped++;
      } else {
        console.error(`   ⚠️  Error saving article ${article.article_number}:`, error.message);
      }
    }
  }
  
  console.log(`   ✅ Saved ${saved} articles (${skipped} skipped)`);
  return saved;
}

async function createRevision(law_id, lawMST) {
  try {
    const revision_id = `${law_id}_rev_latest_${Date.now()}`;
    
    await sql`
      INSERT INTO law_revisions (
        revision_id, law_id, revision_type, revision_date,
        enforcement_date, revision_reason, previous_version, new_version
      ) VALUES (
        ${revision_id}, ${law_id}, '일부개정', CURRENT_DATE,
        CURRENT_DATE, '최초 수집', 'v1.0', 'v1.0'
      )
    `;
    
    return revision_id;
  } catch (error) {
    console.error(`   ⚠️  Error creating revision:`, error.message);
    return null;
  }
}

async function crawlAllArticles() {
  console.log('🚀 Starting article crawl...\n');
  
  // Get all laws
  const laws = await sql`SELECT law_id, law_name FROM laws ORDER BY law_id`;
  
  console.log(`📊 Total laws to process: ${laws.length}\n`);
  
  let totalArticles = 0;
  let processed = 0;
  
  for (const law of laws) {
    console.log(`\n[${ processed + 1}/${laws.length}] ${law.law_name}`);
    console.log(`   ID: ${law.law_id}`);
    
    try {
      // Create a revision record for this law
      const revision_id = await createRevision(law.law_id, law.law_id);
      
      if (!revision_id) {
        console.log(`   ⚠️  Skipping - could not create revision`);
        processed++;
        continue;
      }
      
      // Fetch articles
      const articles = await fetchLawArticles(law.law_id, law.law_id);
      
      if (articles.length === 0) {
        console.log(`   ⚠️  No articles to save`);
        processed++;
        continue;
      }
      
      // Save articles
      const saved = await saveArticles(law.law_id, revision_id, articles);
      totalArticles += saved;
      
      processed++;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error(`   ❌ Error processing law:`, error.message);
      processed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Crawl Summary:');
  console.log(`✅ Laws processed: ${processed}`);
  console.log(`📄 Total articles saved: ${totalArticles}`);
  console.log('='.repeat(60));
  
  // Final verification
  const counts = await sql`
    SELECT COUNT(*) as article_count 
    FROM articles
  `;
  console.log(`\n📈 Articles in database: ${counts[0].article_count}`);
  
  const samples = await sql`
    SELECT law_id, article_number, article_title, 
           LEFT(article_content, 100) as preview
    FROM articles
    ORDER BY created_at DESC
    LIMIT 5
  `;
  
  console.log('\n📝 Sample articles:');
  samples.forEach((art, i) => {
    console.log(`${i + 1}. ${art.law_id} - 제${art.article_number}조 ${art.article_title}`);
    console.log(`   ${art.preview}...`);
  });
}

crawlAllArticles().catch(console.error);
