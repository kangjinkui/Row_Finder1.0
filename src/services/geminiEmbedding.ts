/**
 * Gemini Embedding Service
 * Generates text embeddings using Google Gemini API
 */

export interface EmbeddingResponse {
  success: boolean;
  embedding?: number[];
  error?: string;
}

export interface BatchEmbeddingResponse {
  success: boolean;
  embeddings?: number[][];
  error?: string;
}

/**
 * Generate embedding for a single text using Gemini
 */
export async function generateGeminiEmbedding(
  text: string,
  apiKey: string
): Promise<EmbeddingResponse> {
  try {
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: 'Text cannot be empty'
      };
    }

    // Gemini embeddings API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
    
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
      console.error('[GeminiEmbedding] API error:', errorData);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to generate embedding'
      };
    }

    const data = await response.json();
    const embedding = data.embedding.values;

    // Gemini text-embedding-004 produces 768-dimension embeddings
    // We need to pad or handle dimension mismatch with pgvector(1536)
    // Option 1: Pad with zeros to 1536
    const paddedEmbedding = padEmbedding(embedding, 1536);

    return {
      success: true,
      embedding: paddedEmbedding
    };

  } catch (error) {
    console.error('[GeminiEmbedding] Error generating embedding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate embeddings for multiple texts in batch using Gemini
 */
export async function generateGeminiBatchEmbeddings(
  texts: string[],
  apiKey: string
): Promise<BatchEmbeddingResponse> {
  try {
    if (!texts || texts.length === 0) {
      return {
        success: false,
        error: 'Texts array cannot be empty'
      };
    }

    // Filter out empty texts
    const validTexts = texts.filter(t => t && t.trim().length > 0);

    if (validTexts.length === 0) {
      return {
        success: false,
        error: 'No valid texts to process'
      };
    }

    // Gemini batch embedding API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${apiKey}`;
    
    const embeddings: number[][] = [];
    
    // Process in batches (Gemini supports batch requests)
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < validTexts.length; i += BATCH_SIZE) {
      const batch = validTexts.slice(i, i + BATCH_SIZE);
      
      const requests = batch.map(text => ({
        model: 'models/text-embedding-004',
        content: {
          parts: [{
            text: text
          }]
        }
      }));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: requests
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[GeminiEmbedding] Batch embedding error:', errorData);
        return {
          success: false,
          error: errorData.error?.message || 'Failed to generate embeddings'
        };
      }

      const data = await response.json();
      const batchEmbeddings = data.embeddings.map((item: any) => {
        const embedding = item.values;
        return padEmbedding(embedding, 1536);
      });
      
      embeddings.push(...batchEmbeddings);
    }

    return {
      success: true,
      embeddings
    };

  } catch (error) {
    console.error('[GeminiEmbedding] Error generating batch embeddings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Pad embedding vector to target dimension
 * Gemini text-embedding-004: 768 dimensions
 * PostgreSQL pgvector: 1536 dimensions (configured)
 */
function padEmbedding(embedding: number[], targetDim: number): number[] {
  if (embedding.length === targetDim) {
    return embedding;
  }
  
  if (embedding.length > targetDim) {
    // Truncate if longer
    return embedding.slice(0, targetDim);
  }
  
  // Pad with zeros if shorter
  const padded = [...embedding];
  while (padded.length < targetDim) {
    padded.push(0);
  }
  
  return padded;
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same dimension');
  }

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    magnitude1 += embedding1[i] * embedding1[i];
    magnitude2 += embedding2[i] * embedding2[i];
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Preprocess text before embedding
 */
export function preprocessText(text: string, maxLength: number = 8000): string {
  // Remove excessive whitespace
  let processed = text.replace(/\s+/g, ' ').trim();
  
  // Truncate if too long (Gemini has input limits)
  if (processed.length > maxLength) {
    processed = processed.substring(0, maxLength);
  }
  
  return processed;
}

/**
 * Split long text into chunks for embedding
 */
export function chunkText(text: string, chunkSize: number = 7000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.substring(start, end));
    start = end - overlap;
    
    if (start >= text.length) break;
  }
  
  return chunks;
}
