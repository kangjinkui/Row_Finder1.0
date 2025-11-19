/**
 * Vector Embedding Service
 * Generates text embeddings using OpenAI API
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
 * Generate embedding for a single text
 */
export async function generateEmbedding(
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

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small', // 1536 dimensions, cost-effective
        input: text,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Embedding] OpenAI API error:', errorData);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to generate embedding'
      };
    }

    const data = await response.json();
    const embedding = data.data[0].embedding;

    return {
      success: true,
      embedding
    };

  } catch (error) {
    console.error('[Embedding] Error generating embedding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateBatchEmbeddings(
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

    // OpenAI allows batch processing but has limits
    // Split into chunks if needed (max 2048 texts per request)
    const BATCH_SIZE = 100; // Conservative batch size
    const embeddings: number[][] = [];

    for (let i = 0; i < validTexts.length; i += BATCH_SIZE) {
      const batch = validTexts.slice(i, i + BATCH_SIZE);

      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: batch,
          encoding_format: 'float'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Embedding] Batch embedding error:', errorData);
        return {
          success: false,
          error: errorData.error?.message || 'Failed to generate embeddings'
        };
      }

      const data = await response.json();
      const batchEmbeddings = data.data.map((item: any) => item.embedding);
      embeddings.push(...batchEmbeddings);
    }

    return {
      success: true,
      embeddings
    };

  } catch (error) {
    console.error('[Embedding] Error generating batch embeddings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (norm1 * norm2);
}

/**
 * Preprocess text before embedding
 * Removes excessive whitespace, normalizes formatting
 */
export function preprocessTextForEmbedding(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .trim();
}

/**
 * Chunk long text into smaller pieces for embedding
 * Useful for very long articles that exceed token limits
 */
export function chunkText(text: string, maxTokens: number = 8000): string[] {
  // Rough estimate: 1 token ≈ 4 characters in Korean
  const maxChars = maxTokens * 4;
  const chunks: string[] = [];

  if (text.length <= maxChars) {
    return [text];
  }

  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // If single paragraph is too long, split by sentences
      if (paragraph.length > maxChars) {
        const sentences = paragraph.split(/[.!?]\s+/);
        for (const sentence of sentences) {
          if ((currentChunk + sentence).length > maxChars) {
            if (currentChunk) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = sentence;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
          }
        }
      } else {
        currentChunk = paragraph;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Generate embedding for article text (with preprocessing)
 */
export async function embedArticle(
  articleText: string,
  apiKey: string
): Promise<EmbeddingResponse> {
  const preprocessed = preprocessTextForEmbedding(articleText);
  
  // If text is too long, chunk and average embeddings
  const chunks = chunkText(preprocessed);

  if (chunks.length === 1) {
    return generateEmbedding(chunks[0], apiKey);
  }

  // Generate embeddings for all chunks
  const batchResponse = await generateBatchEmbeddings(chunks, apiKey);

  if (!batchResponse.success || !batchResponse.embeddings) {
    return {
      success: false,
      error: batchResponse.error
    };
  }

  // Average the embeddings
  const avgEmbedding = averageEmbeddings(batchResponse.embeddings);

  return {
    success: true,
    embedding: avgEmbedding
  };
}

/**
 * Average multiple embeddings into one
 */
export function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    return [];
  }

  const dimension = embeddings[0].length;
  const result = new Array(dimension).fill(0);

  for (const embedding of embeddings) {
    for (let i = 0; i < dimension; i++) {
      result[i] += embedding[i];
    }
  }

  for (let i = 0; i < dimension; i++) {
    result[i] /= embeddings.length;
  }

  return result;
}
