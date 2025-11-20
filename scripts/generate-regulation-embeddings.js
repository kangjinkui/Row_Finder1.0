// Generate vector embeddings for local regulations using Gemini API
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

// Preprocess regulation text for embedding
function preprocessText(regulation) {
  // Combine regulation name and metadata
  let text = '';
  
  // Add regulation name
  text += `${regulation.regulation_name}\n\n`;
  
  // Add regulation type and region
  text += `법령 종류: ${regulation.regulation_type}\n`;
  text += `지역: ${regulation.local_gov}\n`;
  
  // Add department if available
  if (regulation.department) {
    text += `담당부서: ${regulation.department}\n`;
  }
  
  // Truncate if too long (Gemini limit ~8000 chars)
  if (text.length > 7000) {
    text = text.substring(0, 7000) + '...';
  }
  
  return text;
}

async function updateRegulationEmbedding(regulation_id, embedding) {
  try {
    // Convert embedding array to pgvector format
    const embeddingStr = '[' + embedding.join(',') + ']';
    
    await sql`
      UPDATE local_regulations 
      SET vector_embedding = ${embeddingStr}::vector
      WHERE regulation_id = ${regulation_id}
    `;
    
    return true;
  } catch (error) {
    console.error(`   ⚠️  Error updating embedding:`, error.message);
    return false;
  }
}

async function generateAllEmbeddings() {
  console.log('🚀 Starting regulation embedding generation...\n');
  
  // Get regulations without embeddings
  const regulations = await sql`
    SELECT regulation_id, regulation_name, regulation_type, local_gov, department
    FROM local_regulations
    WHERE vector_embedding IS NULL
    ORDER BY regulation_name
  `;
  
  console.log(`📊 Regulations to process: ${regulations.length}\n`);
  
  if (regulations.length === 0) {
    console.log('✅ All regulations already have embeddings!');
    return;
  }
  
  let processed = 0;
  let success = 0;
  let failed = 0;
  
  for (const regulation of regulations) {
    processed++;
    
    console.log(`[${processed}/${regulations.length}] Processing: ${regulation.regulation_name}`);
    console.log(`   Type: ${regulation.regulation_type} | Dept: ${regulation.department || 'N/A'}`);
    
    try {
      // Preprocess text
      const text = preprocessText(regulation);
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
      const saved = await updateRegulationEmbedding(regulation.regulation_id, embedding);
      
      if (saved) {
        console.log(`   ✅ Saved to database`);
        success++;
      } else {
        console.log(`   ❌ Failed to save`);
        failed++;
      }
      
      // Progress update every 50 items
      if (processed % 50 === 0) {
        console.log(`\n   ⏸️  Progress: ${processed}/${regulations.length} (${success} success, ${failed} failed)`);
        console.log(`   Pausing for rate limit...\n`);
      }
      
      // Rate limiting - Gemini free tier: 15 requests per minute = 4 seconds per request
      await new Promise(resolve => setTimeout(resolve, 4000));
      
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Regulation Embedding Generation Summary:');
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total processed: ${processed}`);
  console.log('='.repeat(60));
  
  // Verification
  const withEmbedding = await sql`
    SELECT COUNT(*) as count 
    FROM local_regulations 
    WHERE vector_embedding IS NOT NULL
  `;
  
  console.log(`\n📈 Regulations with embeddings: ${withEmbedding[0].count}`);
}

generateAllEmbeddings().catch(console.error);
