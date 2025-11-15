import pool from '../db/connection';
import { FileMetadata, CreateFileMetadataDTO } from '../models/types';

export class FileRepository {
  /**
   * Create a new file metadata entry
   */
  async create(fileData: CreateFileMetadataDTO): Promise<FileMetadata> {
    const query = `
      INSERT INTO files (version_id, filename, file_type, storage_path, file_size, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, version_id as "versionId", filename, file_type as "fileType", 
                storage_path as "storagePath", file_size as "fileSize", 
                uploaded_by as "uploadedBy", created_at as "createdAt"
    `;
    const values = [
      fileData.versionId,
      fileData.filename,
      fileData.fileType,
      fileData.storagePath,
      fileData.fileSize,
      fileData.uploadedBy || null,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find file by ID
   */
  async findById(id: string): Promise<FileMetadata | null> {
    const query = `
      SELECT id, version_id as "versionId", filename, file_type as "fileType", 
             storage_path as "storagePath", file_size as "fileSize", 
             uploaded_by as "uploadedBy", created_at as "createdAt"
      FROM files
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find all files for a version
   */
  async findByVersionId(versionId: string): Promise<FileMetadata[]> {
    const query = `
      SELECT id, version_id as "versionId", filename, file_type as "fileType", 
             storage_path as "storagePath", file_size as "fileSize", 
             uploaded_by as "uploadedBy", created_at as "createdAt"
      FROM files
      WHERE version_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [versionId]);
    return result.rows;
  }

  /**
   * Find files by version and type
   */
  async findByVersionAndType(
    versionId: string,
    fileType: 'ddl' | 'supporting_doc'
  ): Promise<FileMetadata[]> {
    const query = `
      SELECT id, version_id as "versionId", filename, file_type as "fileType", 
             storage_path as "storagePath", file_size as "fileSize", 
             uploaded_by as "uploadedBy", created_at as "createdAt"
      FROM files
      WHERE version_id = $1 AND file_type = $2
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [versionId, fileType]);
    return result.rows;
  }

  /**
   * Check if file exists for version
   */
  async existsByVersionAndFilename(versionId: string, filename: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM files 
        WHERE version_id = $1 AND filename = $2
      ) as exists
    `;
    const result = await pool.query(query, [versionId, filename]);
    return result.rows[0].exists;
  }

  /**
   * Delete file
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM files WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Delete all files for a version
   */
  async deleteByVersionId(versionId: string): Promise<number> {
    const query = 'DELETE FROM files WHERE version_id = $1';
    const result = await pool.query(query, [versionId]);
    return result.rowCount ?? 0;
  }
}
