import pool from '../db/connection';
import { Version, CreateVersionDTO } from '../models/types';

export class VersionRepository {
  /**
   * Create a new version
   */
  async create(versionData: CreateVersionDTO): Promise<Version> {
    const query = `
      INSERT INTO versions (name, description)
      VALUES ($1, $2)
      RETURNING id, name, description, created_at as "createdAt", updated_at as "updatedAt"
    `;
    const values = [versionData.name, versionData.description || null];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find version by ID
   */
  async findById(id: string): Promise<Version | null> {
    const query = `
      SELECT id, name, description, created_at as "createdAt", updated_at as "updatedAt"
      FROM versions
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find version by name
   */
  async findByName(name: string): Promise<Version | null> {
    const query = `
      SELECT id, name, description, created_at as "createdAt", updated_at as "updatedAt"
      FROM versions
      WHERE name = $1
    `;
    const result = await pool.query(query, [name]);
    return result.rows[0] || null;
  }

  /**
   * Get all versions
   */
  async findAll(): Promise<Version[]> {
    const query = `
      SELECT id, name, description, created_at as "createdAt", updated_at as "updatedAt"
      FROM versions
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Update version
   */
  async update(id: string, updates: Partial<CreateVersionDTO>): Promise<Version | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      fields.push('name = $' + paramCount++);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = $' + paramCount++);
      values.push(updates.description);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `
      UPDATE versions
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, description, created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete version (will cascade delete associated files)
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM versions WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
