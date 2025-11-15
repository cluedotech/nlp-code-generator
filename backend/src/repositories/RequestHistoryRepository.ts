import pool from '../db/connection';
import { RequestHistory, CreateRequestHistoryDTO } from '../models/types';

export class RequestHistoryRepository {
  /**
   * Create a new request history entry
   */
  async create(requestData: CreateRequestHistoryDTO): Promise<RequestHistory> {
    const query = `
      INSERT INTO request_history (user_id, version_id, request_text, output_type, generated_code, tokens_used, processing_time_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, user_id as "userId", version_id as "versionId", request_text as "requestText", 
                output_type as "outputType", generated_code as "generatedCode", 
                tokens_used as "tokensUsed", processing_time_ms as "processingTimeMs", 
                created_at as "createdAt"
    `;
    const values = [
      requestData.userId,
      requestData.versionId,
      requestData.requestText,
      requestData.outputType,
      requestData.generatedCode,
      requestData.tokensUsed || null,
      requestData.processingTimeMs || null,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find request by ID
   */
  async findById(id: string): Promise<RequestHistory | null> {
    const query = `
      SELECT id, user_id as "userId", version_id as "versionId", request_text as "requestText", 
             output_type as "outputType", generated_code as "generatedCode", 
             tokens_used as "tokensUsed", processing_time_ms as "processingTimeMs", 
             created_at as "createdAt"
      FROM request_history
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find requests by user ID with pagination
   */
  async findByUserId(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<RequestHistory[]> {
    const query = `
      SELECT id, user_id as "userId", version_id as "versionId", request_text as "requestText", 
             output_type as "outputType", generated_code as "generatedCode", 
             tokens_used as "tokensUsed", processing_time_ms as "processingTimeMs", 
             created_at as "createdAt"
      FROM request_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Find requests by user and output type
   */
  async findByUserAndOutputType(
    userId: string,
    outputType: 'sql' | 'n8n' | 'formio',
    limit: number = 50,
    offset: number = 0
  ): Promise<RequestHistory[]> {
    const query = `
      SELECT id, user_id as "userId", version_id as "versionId", request_text as "requestText", 
             output_type as "outputType", generated_code as "generatedCode", 
             tokens_used as "tokensUsed", processing_time_ms as "processingTimeMs", 
             created_at as "createdAt"
      FROM request_history
      WHERE user_id = $1 AND output_type = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `;
    const result = await pool.query(query, [userId, outputType, limit, offset]);
    return result.rows;
  }

  /**
   * Find requests by user and version
   */
  async findByUserAndVersion(
    userId: string,
    versionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<RequestHistory[]> {
    const query = `
      SELECT id, user_id as "userId", version_id as "versionId", request_text as "requestText", 
             output_type as "outputType", generated_code as "generatedCode", 
             tokens_used as "tokensUsed", processing_time_ms as "processingTimeMs", 
             created_at as "createdAt"
      FROM request_history
      WHERE user_id = $1 AND version_id = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `;
    const result = await pool.query(query, [userId, versionId, limit, offset]);
    return result.rows;
  }

  /**
   * Find requests by user, output type, and version
   */
  async findByUserOutputTypeAndVersion(
    userId: string,
    outputType: 'sql' | 'n8n' | 'formio',
    versionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<RequestHistory[]> {
    const query = `
      SELECT id, user_id as "userId", version_id as "versionId", request_text as "requestText", 
             output_type as "outputType", generated_code as "generatedCode", 
             tokens_used as "tokensUsed", processing_time_ms as "processingTimeMs", 
             created_at as "createdAt"
      FROM request_history
      WHERE user_id = $1 AND output_type = $2 AND version_id = $3
      ORDER BY created_at DESC
      LIMIT $4 OFFSET $5
    `;
    const result = await pool.query(query, [userId, outputType, versionId, limit, offset]);
    return result.rows;
  }

  /**
   * Count total requests for a user
   */
  async countByUserId(userId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM request_history WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Count requests by user and output type
   */
  async countByUserAndOutputType(userId: string, outputType: 'sql' | 'n8n' | 'formio'): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM request_history WHERE user_id = $1 AND output_type = $2';
    const result = await pool.query(query, [userId, outputType]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Count requests by user and version
   */
  async countByUserAndVersion(userId: string, versionId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM request_history WHERE user_id = $1 AND version_id = $2';
    const result = await pool.query(query, [userId, versionId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Count requests by user, output type, and version
   */
  async countByUserOutputTypeAndVersion(
    userId: string,
    outputType: 'sql' | 'n8n' | 'formio',
    versionId: string
  ): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM request_history WHERE user_id = $1 AND output_type = $2 AND version_id = $3';
    const result = await pool.query(query, [userId, outputType, versionId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Delete request
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM request_history WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
