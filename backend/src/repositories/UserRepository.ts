import pool from '../db/connection';
import { User, CreateUserDTO } from '../models/types';

export class UserRepository {
  /**
   * Create a new user
   */
  async create(userData: CreateUserDTO): Promise<User> {
    const query = `
      INSERT INTO users (email, password_hash, role)
      VALUES ($1, $2, $3)
      RETURNING id, email, password_hash as "passwordHash", role, created_at as "createdAt", updated_at as "updatedAt"
    `;
    const values = [userData.email, userData.passwordHash, userData.role];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash as "passwordHash", role, created_at as "createdAt", updated_at as "updatedAt"
      FROM users
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash as "passwordHash", role, created_at as "createdAt", updated_at as "updatedAt"
      FROM users
      WHERE email = $1
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Get all users
   */
  async findAll(): Promise<User[]> {
    const query = `
      SELECT id, email, password_hash as "passwordHash", role, created_at as "createdAt", updated_at as "updatedAt"
      FROM users
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Update user
   */
  async update(id: string, updates: Partial<CreateUserDTO>): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(updates.email);
    }
    if (updates.passwordHash !== undefined) {
      fields.push(`password_hash = $${paramCount++}`);
      values.push(updates.passwordHash);
    }
    if (updates.role !== undefined) {
      fields.push(`role = $${paramCount++}`);
      values.push(updates.role);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, password_hash as "passwordHash", role, created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
