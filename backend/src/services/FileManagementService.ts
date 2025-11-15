import minioService from './MinioService';
import { FileRepository } from '../repositories/FileRepository';
import { CreateFileMetadataDTO, FileMetadata } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import { ragEngine } from './RAGEngine';
import versionCacheService from './VersionCacheService';

/**
 * File Management Service
 * Handles file uploads, validation, and storage coordination
 */
class FileManagementService {
  private fileRepository: FileRepository;

  constructor() {
    this.fileRepository = new FileRepository();
  }

  /**
   * Validate DDL file syntax
   * Basic validation to check if the content looks like valid SQL DDL
   */
  private validateDDLSyntax(content: string): { valid: boolean; error?: string } {
    const trimmedContent = content.trim();
    
    if (!trimmedContent) {
      return { valid: false, error: 'DDL file is empty' };
    }

    // Check for common DDL keywords
    const ddlKeywords = [
      'CREATE TABLE',
      'CREATE INDEX',
      'CREATE VIEW',
      'CREATE SCHEMA',
      'ALTER TABLE',
      'DROP TABLE',
      'CREATE TYPE',
      'CREATE SEQUENCE'
    ];

    const upperContent = trimmedContent.toUpperCase();
    const hasDDLKeyword = ddlKeywords.some(keyword => upperContent.includes(keyword));

    if (!hasDDLKeyword) {
      return { 
        valid: false, 
        error: 'File does not appear to contain valid DDL statements. Expected keywords like CREATE TABLE, ALTER TABLE, etc.' 
      };
    }

    // Basic syntax checks
    const openParens = (trimmedContent.match(/\(/g) || []).length;
    const closeParens = (trimmedContent.match(/\)/g) || []).length;

    if (openParens !== closeParens) {
      return { 
        valid: false, 
        error: 'Unbalanced parentheses in DDL file' 
      };
    }

    return { valid: true };
  }

  /**
   * Upload DDL file
   * Validates syntax, stores in MinIO, and saves metadata to database
   */
  async uploadDDLFile(
    versionId: string,
    file: Express.Multer.File,
    uploadedBy?: string
  ): Promise<FileMetadata> {
    try {
      // Validate DDL syntax
      const content = file.buffer.toString('utf-8');
      const validation = this.validateDDLSyntax(content);

      if (!validation.valid) {
        throw new Error(`DDL validation failed: ${validation.error}`);
      }

      // Generate unique storage path
      const fileId = uuidv4();
      const storagePath = `${versionId}/${fileId}-${file.originalname}`;

      // Upload to MinIO
      await minioService.uploadDDLFile(
        storagePath,
        file.buffer,
        file.size,
        {
          'Content-Type': 'text/plain',
          'Original-Filename': file.originalname,
        }
      );

      // Save metadata to database
      const fileMetadata: CreateFileMetadataDTO = {
        versionId,
        filename: file.originalname,
        fileType: 'ddl',
        storagePath,
        fileSize: file.size,
        uploadedBy,
      };

      const savedFile = await this.fileRepository.create(fileMetadata);

      // Index DDL content in RAG engine
      try {
        await ragEngine.indexDocument(
          content,
          versionId,
          savedFile.id,
          file.originalname
        );
        console.log(`DDL file ${file.originalname} indexed successfully`);
      } catch (indexError) {
        console.error('Error indexing DDL file:', indexError);
        // Don't fail the upload if indexing fails, but log the error
      }

      // Invalidate version cache since files have changed
      await versionCacheService.invalidateVersionCache(versionId);

      return savedFile;
    } catch (error) {
      console.error('Error uploading DDL file:', error);
      throw error;
    }
  }

  /**
   * Extract text content from different file types
   */
  private extractTextContent(file: Express.Multer.File): string {
    const extension = file.originalname.toLowerCase().split('.').pop();
    
    // For now, we'll handle text-based files directly
    // PDF extraction would require additional libraries like pdf-parse
    if (extension === 'txt' || extension === 'md' || extension === 'markdown') {
      return file.buffer.toString('utf-8');
    }
    
    // For PDF files, we'll store them as-is and handle extraction later
    // This is a placeholder for future PDF text extraction
    if (extension === 'pdf') {
      return '[PDF content - text extraction to be implemented]';
    }
    
    return file.buffer.toString('utf-8');
  }

  /**
   * Validate supporting document
   */
  private validateSupportingDoc(file: Express.Multer.File): { valid: boolean; error?: string } {
    const allowedExtensions = ['pdf', 'md', 'markdown', 'txt'];
    const extension = file.originalname.toLowerCase().split('.').pop();

    if (!extension || !allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `Unsupported file type. Allowed types: ${allowedExtensions.join(', ')}`,
      };
    }

    if (file.size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    return { valid: true };
  }

  /**
   * Upload supporting document
   * Validates file type, stores in MinIO, and saves metadata to database
   */
  async uploadSupportingDoc(
    versionId: string,
    file: Express.Multer.File,
    uploadedBy?: string
  ): Promise<FileMetadata> {
    try {
      // Validate file
      const validation = this.validateSupportingDoc(file);

      if (!validation.valid) {
        throw new Error(`Document validation failed: ${validation.error}`);
      }

      // Extract text content for indexing (future RAG integration)
      const textContent = this.extractTextContent(file);

      // Generate unique storage path
      const fileId = uuidv4();
      const storagePath = `${versionId}/${fileId}-${file.originalname}`;

      // Upload to MinIO
      await minioService.uploadSupportingDoc(
        storagePath,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype || 'application/octet-stream',
          'Original-Filename': file.originalname,
        }
      );

      // Save metadata to database
      const fileMetadata: CreateFileMetadataDTO = {
        versionId,
        filename: file.originalname,
        fileType: 'supporting_doc',
        storagePath,
        fileSize: file.size,
        uploadedBy,
      };

      const savedFile = await this.fileRepository.create(fileMetadata);
      
      // Index text content in RAG engine
      try {
        await ragEngine.indexDocument(
          textContent,
          versionId,
          savedFile.id,
          file.originalname
        );
        console.log(`Supporting document ${file.originalname} indexed successfully`);
      } catch (indexError) {
        console.error('Error indexing supporting document:', indexError);
        // Don't fail the upload if indexing fails, but log the error
      }
      
      // Invalidate version cache since files have changed
      await versionCacheService.invalidateVersionCache(versionId);
      
      return savedFile;
    } catch (error) {
      console.error('Error uploading supporting document:', error);
      throw error;
    }
  }

  /**
   * Get file by ID
   */
  async getFileById(fileId: string): Promise<FileMetadata | null> {
    return this.fileRepository.findById(fileId);
  }

  /**
   * Get files by version ID
   */
  async getFilesByVersion(versionId: string): Promise<FileMetadata[]> {
    return this.fileRepository.findByVersionId(versionId);
  }

  /**
   * Delete file
   * Removes from MinIO and database
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      // Get file metadata
      const file = await this.fileRepository.findById(fileId);
      if (!file) {
        throw new Error('File not found');
      }

      // Determine bucket based on file type
      const bucket = file.fileType === 'ddl' 
        ? minioService.getDDLBucket() 
        : minioService.getDocsBucket();

      // Delete from MinIO
      await minioService.deleteFile(bucket, file.storagePath);

      // Delete embeddings from RAG engine
      try {
        await ragEngine.deleteFileEmbeddings(fileId);
        console.log(`Embeddings for file ${fileId} deleted successfully`);
      } catch (indexError) {
        console.error('Error deleting file embeddings:', indexError);
        // Continue with deletion even if RAG cleanup fails
      }

      // Delete metadata from database
      await this.fileRepository.delete(fileId);

      // Invalidate version cache since files have changed
      await versionCacheService.invalidateVersionCache(file.versionId);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
}

export default new FileManagementService();
