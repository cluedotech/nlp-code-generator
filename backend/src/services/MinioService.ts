import * as Minio from 'minio';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MinIO Service for file storage operations
 * Handles connection to MinIO and bucket management
 */
class MinioService {
  private client: Minio.Client;
  private readonly ddlBucket = 'ddl-files';
  private readonly docsBucket = 'supporting-docs';

  constructor() {
    // Initialize MinIO client with connection settings
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'minio',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
      secretKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
    });
  }

  /**
   * Initialize buckets - create them if they don't exist
   */
  async initializeBuckets(): Promise<void> {
    try {
      // Create DDL files bucket
      const ddlExists = await this.client.bucketExists(this.ddlBucket);
      if (!ddlExists) {
        await this.client.makeBucket(this.ddlBucket, 'us-east-1');
        console.log(`Bucket '${this.ddlBucket}' created successfully`);
      }

      // Create supporting documents bucket
      const docsExists = await this.client.bucketExists(this.docsBucket);
      if (!docsExists) {
        await this.client.makeBucket(this.docsBucket, 'us-east-1');
        console.log(`Bucket '${this.docsBucket}' created successfully`);
      }
    } catch (error) {
      console.error('Error initializing MinIO buckets:', error);
      throw error;
    }
  }

  /**
   * Upload a file to MinIO
   * @param bucket - Bucket name (ddl-files or supporting-docs)
   * @param objectName - Object name/path in the bucket
   * @param buffer - File buffer
   * @param size - File size in bytes
   * @param metadata - Optional metadata
   */
  async uploadFile(
    bucket: string,
    objectName: string,
    buffer: Buffer,
    size: number,
    metadata?: Record<string, string>
  ): Promise<void> {
    try {
      await this.client.putObject(bucket, objectName, buffer, size, metadata);
    } catch (error) {
      console.error('Error uploading file to MinIO:', error);
      throw error;
    }
  }

  /**
   * Upload a DDL file
   */
  async uploadDDLFile(
    objectName: string,
    buffer: Buffer,
    size: number,
    metadata?: Record<string, string>
  ): Promise<void> {
    return this.uploadFile(this.ddlBucket, objectName, buffer, size, metadata);
  }

  /**
   * Upload a supporting document
   */
  async uploadSupportingDoc(
    objectName: string,
    buffer: Buffer,
    size: number,
    metadata?: Record<string, string>
  ): Promise<void> {
    return this.uploadFile(this.docsBucket, objectName, buffer, size, metadata);
  }

  /**
   * Download a file from MinIO
   */
  async downloadFile(bucket: string, objectName: string): Promise<Buffer> {
    try {
      const chunks: Buffer[] = [];
      const stream = await this.client.getObject(bucket, objectName);
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('Error downloading file from MinIO:', error);
      throw error;
    }
  }

  /**
   * Delete a file from MinIO
   */
  async deleteFile(bucket: string, objectName: string): Promise<void> {
    try {
      await this.client.removeObject(bucket, objectName);
    } catch (error) {
      console.error('Error deleting file from MinIO:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(bucket: string, objectName: string): Promise<Minio.BucketItemStat> {
    try {
      return await this.client.statObject(bucket, objectName);
    } catch (error) {
      console.error('Error getting file metadata from MinIO:', error);
      throw error;
    }
  }

  /**
   * Get bucket name for DDL files
   */
  getDDLBucket(): string {
    return this.ddlBucket;
  }

  /**
   * Get bucket name for supporting documents
   */
  getDocsBucket(): string {
    return this.docsBucket;
  }
}

// Export singleton instance
export default new MinioService();
