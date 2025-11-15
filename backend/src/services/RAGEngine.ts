import OpenAI from 'openai';
import { qdrantService } from './QdrantService';
import { v4 as uuidv4 } from 'uuid';

interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    versionId: string;
    fileId: string;
    filename: string;
    chunkIndex: number;
    totalChunks: number;
  };
}

interface ContextChunk {
  content: string;
  source: string;
  relevanceScore: number;
  metadata: {
    versionId: string;
    fileId: string;
    filename: string;
  };
}

export class RAGEngine {
  private openai: OpenAI;
  private embeddingModel: string;
  private chunkSize: number = 1000; // characters per chunk
  private chunkOverlap: number = 200; // overlap between chunks

  constructor() {
    const apiKey = process.env.LLM_API_KEY;
    const baseURL = process.env.LLM_API_URL;

    if (!apiKey) {
      throw new Error('LLM_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey,
      baseURL: baseURL || 'https://api.openai.com/v1',
    });

    this.embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
  }

  /**
   * Chunk text into semantic segments with overlap
   */
  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    
    // Remove excessive whitespace and normalize line breaks
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    
    if (normalizedText.length <= this.chunkSize) {
      return [normalizedText];
    }

    let startIndex = 0;
    
    while (startIndex < normalizedText.length) {
      let endIndex = startIndex + this.chunkSize;
      
      // If not at the end, try to break at a sentence or word boundary
      if (endIndex < normalizedText.length) {
        // Look for sentence boundary (. ! ?)
        const sentenceEnd = normalizedText.lastIndexOf('.', endIndex);
        const exclamationEnd = normalizedText.lastIndexOf('!', endIndex);
        const questionEnd = normalizedText.lastIndexOf('?', endIndex);
        
        const maxSentenceEnd = Math.max(sentenceEnd, exclamationEnd, questionEnd);
        
        if (maxSentenceEnd > startIndex + this.chunkSize / 2) {
          endIndex = maxSentenceEnd + 1;
        } else {
          // Fall back to word boundary
          const spaceIndex = normalizedText.lastIndexOf(' ', endIndex);
          if (spaceIndex > startIndex) {
            endIndex = spaceIndex;
          }
        }
      }
      
      const chunk = normalizedText.substring(startIndex, endIndex).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      
      // Move start index with overlap
      startIndex = endIndex - this.chunkOverlap;
      
      // Ensure we make progress
      const lastChunkIndex = chunks.length > 0 ? normalizedText.indexOf(chunks[chunks.length - 1]) : 0;
      if (startIndex <= lastChunkIndex) {
        startIndex = endIndex;
      }
    }
    
    return chunks;
  }

  /**
   * Generate embeddings for text using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Index a document by chunking and storing embeddings in Qdrant
   */
  async indexDocument(
    content: string,
    versionId: string,
    fileId: string,
    filename: string
  ): Promise<void> {
    try {
      // Chunk the document
      const textChunks = this.chunkText(content);
      console.log(`Chunked document into ${textChunks.length} chunks`);

      // Generate embeddings and prepare points for Qdrant
      const points = [];
      
      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        const embedding = await this.generateEmbedding(chunk);
        
        const point = {
          id: uuidv4(),
          vector: embedding,
          payload: {
            content: chunk,
            versionId,
            fileId,
            filename,
            chunkIndex: i,
            totalChunks: textChunks.length,
          },
        };
        
        points.push(point);
      }

      // Store in Qdrant
      const client = qdrantService.getClient();
      const collectionName = qdrantService.getCollectionName();
      
      await client.upsert(collectionName, {
        wait: true,
        points,
      });

      console.log(`Indexed ${points.length} chunks for file ${filename}`);
    } catch (error) {
      console.error('Error indexing document:', error);
      throw new Error('Failed to index document');
    }
  }

  /**
   * Delete all embeddings for a specific file
   */
  async deleteFileEmbeddings(fileId: string): Promise<void> {
    try {
      const client = qdrantService.getClient();
      const collectionName = qdrantService.getCollectionName();

      await client.delete(collectionName, {
        wait: true,
        filter: {
          must: [
            {
              key: 'fileId',
              match: {
                value: fileId,
              },
            },
          ],
        },
      });

      console.log(`Deleted embeddings for file ${fileId}`);
    } catch (error) {
      console.error('Error deleting file embeddings:', error);
      throw new Error('Failed to delete file embeddings');
    }
  }

  /**
   * Delete all embeddings for a specific version
   */
  async deleteVersionEmbeddings(versionId: string): Promise<void> {
    try {
      const client = qdrantService.getClient();
      const collectionName = qdrantService.getCollectionName();

      await client.delete(collectionName, {
        wait: true,
        filter: {
          must: [
            {
              key: 'versionId',
              match: {
                value: versionId,
              },
            },
          ],
        },
      });

      console.log(`Deleted embeddings for version ${versionId}`);
    } catch (error) {
      console.error('Error deleting version embeddings:', error);
      throw new Error('Failed to delete version embeddings');
    }
  }

  /**
   * Retrieve relevant context chunks for a query
   */
  async retrieveContext(
    query: string,
    versionId: string,
    topK: number = 5
  ): Promise<ContextChunk[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Search Qdrant for similar chunks filtered by versionId
      const client = qdrantService.getClient();
      const collectionName = qdrantService.getCollectionName();

      const searchResults = await client.search(collectionName, {
        vector: queryEmbedding,
        limit: topK,
        filter: {
          must: [
            {
              key: 'versionId',
              match: {
                value: versionId,
              },
            },
          ],
        },
        with_payload: true,
      });

      // Transform results into ContextChunk format
      const contextChunks: ContextChunk[] = searchResults.map((result) => ({
        content: result.payload?.content as string,
        source: result.payload?.filename as string,
        relevanceScore: result.score || 0,
        metadata: {
          versionId: result.payload?.versionId as string,
          fileId: result.payload?.fileId as string,
          filename: result.payload?.filename as string,
        },
      }));

      console.log(`Retrieved ${contextChunks.length} context chunks for query`);
      return contextChunks;
    } catch (error) {
      console.error('Error retrieving context:', error);
      throw new Error('Failed to retrieve context');
    }
  }

  /**
   * Build a formatted context string from retrieved chunks
   */
  buildContextString(chunks: ContextChunk[]): string {
    if (chunks.length === 0) {
      return 'No relevant context found.';
    }

    const contextParts = chunks.map((chunk, index) => {
      return `[Source: ${chunk.source}, Relevance: ${chunk.relevanceScore.toFixed(3)}]\n${chunk.content}`;
    });

    return contextParts.join('\n\n---\n\n');
  }
}

// Export singleton instance
export const ragEngine = new RAGEngine();
