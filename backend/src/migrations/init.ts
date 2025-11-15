import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const SALT_ROUNDS = 10;
const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

async function runMigrations() {
  console.log('Running database migrations...');
  
  const migrationFile = path.join(__dirname, '001_initial_schema.sql');
  const sql = fs.readFileSync(migrationFile, 'utf-8');
  
  await pool.query(sql);
  
  console.log('✓ Migrations completed successfully');
}

async function createDefaultAdminUser() {
  console.log('Checking for default admin user...');
  
  // Check if admin user already exists
  const existingAdmin = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [DEFAULT_ADMIN_EMAIL]
  );
  
  if (existingAdmin.rows.length > 0) {
    console.log('✓ Default admin user already exists');
    return;
  }
  
  // Create default admin user
  console.log('Creating default admin user...');
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, SALT_ROUNDS);
  
  await pool.query(
    `INSERT INTO users (email, password_hash, role) 
     VALUES ($1, $2, $3)`,
    [DEFAULT_ADMIN_EMAIL, passwordHash, 'admin']
  );
  
  console.log('✓ Default admin user created successfully');
  console.log(`  Email: ${DEFAULT_ADMIN_EMAIL}`);
  console.log(`  Password: ${DEFAULT_ADMIN_PASSWORD}`);
  console.log('  ⚠️  IMPORTANT: Change the default password after first login!');
}

async function initializeDatabase() {
  try {
    console.log('=== Database Initialization ===\n');
    
    // Run migrations
    await runMigrations();
    
    // Create default admin user
    await createDefaultAdminUser();
    
    console.log('\n=== Initialization Complete ===');
    process.exit(0);
  } catch (error) {
    console.error('Initialization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeDatabase();
