import pool from '../db/connection';
import { ErrorLog, CreateErrorLogDTO } from '../models/types';

export class ErrorLogRepository {
  /**
   * Create a new error log entry
   */
  async create(errorData: CreateErrorLogDTO): Promise<ErrorLog> {
    const query = `
      INSERT INTO error_logs (user_id, request_text, error_message, error_stack)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id as "userId", request_text as "requestText", 
                error_message as "errorMessage", error_stack as "errorStack", 
                created_at as "createdAt"
    `;
    const values = [
      errorData.userId || null,
      errorData.requestText || null,
      errorData.errorMessage,
      errorData.errorStack || null,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find error log by ID
   */
  async findById(id: string): Promise<ErrorLog | null> {
    const query = `
      SELECT id, user_id as "userId", request_text as "requestText", 
             error_message as "errorMessage", error_stack as "errorStack", 
             created_at as "createdAt"
      FROM error_logs
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find error logs by user ID
   */
  async findByUserId(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ErrorLog[]> {
    const query = `
      SELECT id, user_id as "userId", request_text as "requestText", 
             error_message as "errorMessage", error_stack as "errorStack", 
             created_at as "createdAt"
      FROM error_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Find recent error logs
   */
  async findRecent(limit: number = 100, offset: number = 0): Promise<ErrorLog[]> {
    const query = `
      SELECT id, user_id as "userId", request_text as "requestText", 
             error_message as "errorMessage", error_stack as "errorStack", 
             created_at as "createdAt"
      FROM error_logs
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  /**
   * Count total error logs
   */
  async count(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM error_logs';
    const result = await pool.query(query);
    return parseInt(result.rows[0].count);
  }

  /**
   * Delete error log
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM error_logs WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Delete old error logs (older than specified days)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const query = `
      DELETE FROM error_logs 
      WHERE created_at < NOW() - INTERVAL '${days} days'
    `;
    const result = await pool.query(query);
    return result.rowCount ?? 0;
  }
}
