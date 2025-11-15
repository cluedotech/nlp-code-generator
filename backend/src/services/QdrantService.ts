import { QdrantClient } from '@qdrant/js-client-rest';

export class QdrantService {
  private client: QdrantClient;
  private collectionName: string = 'document_embeddings';
  private vectorDimensions: number;

  constructor() {
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    const apiKey = process.env.QDRANT_API_KEY;
    
    this.vectorDimensions = parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10);

    this.client = new QdrantClient({
      url: qdrantUrl,
      apiKey: apiKey || undefined,
    });
  }

  /**
   * Initialize the Qdrant collection for document embeddings
   * Creates collection if it doesn't exist
   */
  async initializeCollection(): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (col) => col.name === this.collectionName
      );

      if (!collectionExists) {
        // Create collection with vector configuration
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorDimensions,
            distance: 'Cosine', // Cosine similarity for text embeddings
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        });

        // Create payload index for versionId to enable efficient filtering
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'versionId',
          field_schema: 'keyword',
        });

        // Create payload index for fileId
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'fileId',
          field_schema: 'keyword',
        });

        console.log(`Qdrant collection '${this.collectionName}' created successfully`);
      } else {
        console.log(`Qdrant collection '${this.collectionName}' already exists`);
      }
    } catch (error) {
      console.error('Error initializing Qdrant collection:', error);
      throw new Error('Failed to initialize Qdrant collection');
    }
  }

  /**
   * Get the Qdrant client instance
   */
  getClient(): QdrantClient {
    return this.client;
  }

  /**
   * Get the collection name
   */
  getCollectionName(): string {
    return this.collectionName;
  }

  /**
   * Get vector dimensions
   */
  getVectorDimensions(): number {
    return this.vectorDimensions;
  }

  /**
   * Check if Qdrant service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      console.error('Qdrant health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const qdrantService = new QdrantService();
