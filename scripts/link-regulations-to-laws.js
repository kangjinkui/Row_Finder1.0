// Link local regulations to superior law articles using vector similarity
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

// Similarity threshold (0.0 - 1.0)
const SIMILARITY_THRESHOLD = 0.65; // Only save links with similarity >= 0.65
const TOP_N_MATCHES = 5; // Save top 5 most similar law articles per regulation

async function findSimilarLawArticles(regulationId, regulationEmbedding) {
  try {
    // Find most similar law articles using cosine similarity
    const similar = await sql`
      SELECT 
        a.article_id,
        a.law_id,
        a.article_number,
        a.article_title,
        a.article_content,
        l.law_name,
        1 - (a.vector_embedding <=> ${regulationEmbedding}::vector) as similarity
      FROM articles a
      JOIN laws l ON a.law_id = l.law_id
      WHERE a.vector_embedding IS NOT NULL
        AND a.article_content NOT LIKE '%삭제%'
      ORDER BY a.vector_embedding <=> ${regulationEmbedding}::vector
      LIMIT ${TOP_N_MATCHES}
    `;
    
    return similar;
  } catch (error) {
    console.error(`   ⚠️  Error finding similar articles:`, error.message);
    return [];
  }
}

async function saveLawRegulationLink(regulationId, articleId, lawId, similarity, rank) {
  try {
    // Generate unique link ID
    const linkId = `link_${regulationId}_${articleId}_${Date.now()}`;
    
    await sql`
      INSERT INTO law_regulation_links (
        link_id,
        law_id,
        regulation_id,
        article_id,
        confidence_score,
        link_type,
        verified,
        created_at
      ) VALUES (
        ${linkId},
        ${lawId},
        ${regulationId},
        ${articleId},
        ${similarity},
        '근거법령',
        false,
        NOW()
      )
      ON CONFLICT (link_id) DO UPDATE
      SET confidence_score = ${similarity}
    `;
    
    return true;
  } catch (error) {
    console.error(`   ⚠️  Error saving link:`, error.message);
    return false;
  }
}

async function linkRegulationsToLaws() {
  console.log('🚀 Starting regulation-law linkage analysis...\n');
  
  // Get all regulations with embeddings
  const regulations = await sql`
    SELECT regulation_id, regulation_name, regulation_type, vector_embedding
    FROM local_regulations
    WHERE vector_embedding IS NOT NULL
    ORDER BY regulation_name
  `;
  
  console.log(`📊 Regulations to process: ${regulations.length}\n`);
  
  if (regulations.length === 0) {
    console.log('⚠️  No regulations with embeddings found!');
    return;
  }
  
  let processed = 0;
  let totalLinks = 0;
  let regulationsWithLinks = 0;
  
  for (const regulation of regulations) {
    processed++;
    
    console.log(`[${processed}/${regulations.length}] ${regulation.regulation_name}`);
    console.log(`   Type: ${regulation.regulation_type}`);
    
    try {
      // Find similar law articles
      const similarArticles = await findSimilarLawArticles(
        regulation.regulation_id,
        regulation.vector_embedding
      );
      
      if (similarArticles.length === 0) {
        console.log(`   ⚠️  No similar articles found`);
        continue;
      }
      
      console.log(`   ✓ Found ${similarArticles.length} similar articles:`);
      
      let linksCreated = 0;
      
      for (let i = 0; i < similarArticles.length; i++) {
        const article = similarArticles[i];
        const similarity = parseFloat(article.similarity);
        
        // Only save if similarity is above threshold
        if (similarity >= SIMILARITY_THRESHOLD) {
          const saved = await saveLawRegulationLink(
            regulation.regulation_id,
            article.article_id,
            article.law_id,
            similarity,
            i + 1
          );
          
          if (saved) {
            linksCreated++;
            totalLinks++;
            
            console.log(`     ${i + 1}. [${similarity.toFixed(3)}] ${article.law_name} - 제${article.article_number}조`);
          }
        } else {
          console.log(`     ${i + 1}. [${similarity.toFixed(3)}] ${article.law_name} - 제${article.article_number}조 (below threshold)`);
        }
      }
      
      if (linksCreated > 0) {
        regulationsWithLinks++;
        console.log(`   ✅ Created ${linksCreated} links`);
      } else {
        console.log(`   ⚠️  No links created (all below threshold ${SIMILARITY_THRESHOLD})`);
      }
      
      // Progress update every 50 items
      if (processed % 50 === 0) {
        console.log(`\n   📊 Progress: ${processed}/${regulations.length}`);
        console.log(`   📈 Total links created: ${totalLinks}`);
        console.log(`   🔗 Regulations with links: ${regulationsWithLinks}\n`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Linkage Analysis Summary:');
  console.log(`✅ Total regulations processed: ${processed}`);
  console.log(`🔗 Total links created: ${totalLinks}`);
  console.log(`📈 Regulations with links: ${regulationsWithLinks}`);
  console.log(`📊 Average links per regulation: ${(totalLinks / regulationsWithLinks).toFixed(2)}`);
  console.log('='.repeat(60));
  
  // Verification
  const linkCount = await sql`
    SELECT COUNT(*) as count 
    FROM law_regulation_links
  `;
  
  console.log(`\n✅ Total links in database: ${linkCount[0].count}`);
  
  // Top linked laws
  console.log('\n📊 Top 5 Most Referenced Laws:');
  const topLaws = await sql`
    SELECT 
      l.law_name,
      COUNT(DISTINCT lrl.regulation_id) as regulation_count,
      AVG(lrl.confidence_score) as avg_similarity
    FROM law_regulation_links lrl
    JOIN laws l ON lrl.law_id = l.law_id
    GROUP BY l.law_id, l.law_name
    ORDER BY regulation_count DESC
    LIMIT 5
  `;
  
  topLaws.forEach((law, i) => {
    console.log(`${i + 1}. ${law.law_name}`);
    console.log(`   Referenced by ${law.regulation_count} regulations (avg similarity: ${parseFloat(law.avg_similarity).toFixed(3)})`);
  });
  
  // Sample links
  console.log('\n🔍 Sample Regulation Links:');
  const sampleLinks = await sql`
    SELECT 
      lr.regulation_name,
      l.law_name,
      a.article_number,
      a.article_title,
      lrl.confidence_score
    FROM law_regulation_links lrl
    JOIN local_regulations lr ON lrl.regulation_id = lr.regulation_id
    JOIN laws l ON lrl.law_id = l.law_id
    JOIN articles a ON lrl.article_id = a.article_id
    ORDER BY lrl.confidence_score DESC
    LIMIT 5
  `;
  
  sampleLinks.forEach((link, i) => {
    console.log(`\n${i + 1}. ${link.regulation_name}`);
    console.log(`   → ${link.law_name} 제${link.article_number}조 ${link.article_title || ''}`);
    console.log(`   Similarity: ${parseFloat(link.confidence_score).toFixed(3)}`);
  });
}

linkRegulationsToLaws().catch(console.error);
