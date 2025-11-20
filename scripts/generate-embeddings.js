// Generate vector embeddings for law articles using Gemini API
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const sql = neon(DATABASE_URL);

// Generate embedding using Gemini
async function generateGeminiEmbedding(text) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: {
          parts: [{
            text: text
          }]
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const embedding = data.embedding.values;
    
    // Gemini text-embedding-004 produces 768-dimension embeddings
    // We need to pad to 1536 for pgvector
    const paddedEmbedding = padEmbedding(embedding, 1536);
    
    return paddedEmbedding;
    
  } catch (error) {
    console.error(`   ❌ Embedding error:`, error.message);
    return null;
  }
}

// Pad embedding to target dimension
function padEmbedding(embedding, targetDim) {
  if (embedding.length === targetDim) {
    return embedding;
  }
  
  if (embedding.length > targetDim) {
    return embedding.slice(0, targetDim);
  }
  
  // Pad with zeros
  const padded = [...embedding];
  while (padded.length < targetDim) {
    padded.push(0);
  }
  
  return padded;
}

// Preprocess text for embedding
function preprocessText(article) {
  // Combine title and content
  let text = '';
  
  if (article.article_title) {
    text += `제${article.article_number}조 ${article.article_title}\n\n`;
  } else {
    text += `제${article.article_number}조\n\n`;
  }
  
  text += article.article_content;
  
  // Truncate if too long (Gemini limit ~8000 chars)
  if (text.length > 7000) {
    text = text.substring(0, 7000) + '...';
  }
  
  return text;
}

async function updateArticleEmbedding(article_id, embedding) {
  try {
    // Convert embedding array to pgvector format
    const embeddingStr = '[' + embedding.join(',') + ']';
    
    await sql`
      UPDATE articles 
      SET vector_embedding = ${embeddingStr}::vector
      WHERE article_id = ${article_id}
    `;
    
    return true;
  } catch (error) {
    console.error(`   ⚠️  Error updating embedding:`, error.message);
    return false;
  }
}

async function generateAllEmbeddings() {
  console.log('🚀 Starting embedding generation...\n');
  
  // Get active articles (not deleted)
  const articles = await sql`
    SELECT article_id, law_id, article_number, article_title, article_content
    FROM articles
    WHERE article_content NOT LIKE '%삭제%'
      AND LENGTH(article_content) > 50
      AND vector_embedding IS NULL
    ORDER BY law_id, article_number
  `;
  
  console.log(`📊 Articles to process: ${articles.length}\n`);
  
  if (articles.length === 0) {
    console.log('✅ All articles already have embeddings!');
    return;
  }
  
  let processed = 0;
  let success = 0;
  let failed = 0;
  
  for (const article of articles) {
    processed++;
    
    console.log(`[${processed}/${articles.length}] Processing article ${article.article_id}`);
    console.log(`   Law: ${article.law_id}, Article: 제${article.article_number}조`);
    
    try {
      // Preprocess text
      const text = preprocessText(article);
      console.log(`   Text length: ${text.length} chars`);
      
      // Generate embedding
      const embedding = await generateGeminiEmbedding(text);
      
      if (!embedding) {
        console.log(`   ❌ Failed to generate embedding`);
        failed++;
        continue;
      }
      
      console.log(`   ✓ Generated embedding (${embedding.length} dimensions)`);
      
      // Save to database
      const saved = await updateArticleEmbedding(article.article_id, embedding);
      
      if (saved) {
        console.log(`   ✅ Saved to database`);
        success++;
      } else {
        console.log(`   ❌ Failed to save`);
        failed++;
      }
      
      // Rate limiting - Gemini free tier
      // 15 requests per minute = 4 seconds per request
      if (processed % 10 === 0) {
        console.log(`\n   ⏸️  Progress: ${processed}/${articles.length} (${success} success, ${failed} failed)`);
        console.log(`   Pausing for rate limit...\n`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 4000));
      
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Embedding Generation Summary:');
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total processed: ${processed}`);
  console.log('='.repeat(60));
  
  // Verification
  const withEmbedding = await sql`
    SELECT COUNT(*) as count 
    FROM articles 
    WHERE vector_embedding IS NOT NULL
  `;
  
  console.log(`\n📈 Articles with embeddings: ${withEmbedding[0].count}`);
  
  // Test vector search
  console.log('\n🔍 Testing vector search...');
  const testArticle = await sql`
    SELECT article_id, article_number, article_title, vector_embedding
    FROM articles
    WHERE vector_embedding IS NOT NULL
    LIMIT 1
  `;
  
  if (testArticle.length > 0) {
    const similar = await sql`
      SELECT 
        article_id, 
        article_number, 
        article_title,
        1 - (vector_embedding <=> ${testArticle[0].vector_embedding}::vector) as similarity
      FROM articles
      WHERE vector_embedding IS NOT NULL
        AND article_id != ${testArticle[0].article_id}
      ORDER BY vector_embedding <=> ${testArticle[0].vector_embedding}::vector
      LIMIT 3
    `;
    
    console.log(`\nTest: Similar articles to 제${testArticle[0].article_number}조 ${testArticle[0].article_title}:`);
    similar.forEach((art, i) => {
      console.log(`${i + 1}. 제${art.article_number}조 ${art.article_title} (similarity: ${art.similarity.toFixed(3)})`);
    });
  }
}

generateAllEmbeddings().catch(console.error);
