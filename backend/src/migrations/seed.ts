import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import minioService from '../services/MinioService';
import { RAGEngine } from '../services/RAGEngine';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface SampleVersion {
  name: string;
  description: string;
  ddlFile: string;
  docFile: string;
}

const SAMPLE_VERSIONS: SampleVersion[] = [
  {
    name: 'E-commerce v1.0',
    description: 'E-commerce platform database schema with customers, products, and orders',
    ddlFile: 'sample-ddl-ecommerce.sql',
    docFile: 'sample-doc-ecommerce.md',
  },
  {
    name: 'HR System v1.0',
    description: 'Human Resources management system with employees, departments, and attendance',
    ddlFile: 'sample-ddl-hr.sql',
    docFile: 'sample-doc-hr.md',
  },
];

async function getAdminUserId(): Promise<string> {
  const result = await pool.query(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  );
  
  if (result.rows.length === 0) {
    throw new Error('No admin user found. Please run initialization first.');
  }
  
  return result.rows[0].id;
}

async function createVersion(name: string, description: string): Promise<string> {
  // Check if version already exists
  const existing = await pool.query(
    'SELECT id FROM versions WHERE name = $1',
    [name]
  );
  
  if (existing.rows.length > 0) {
    console.log(`  Version "${name}" already exists, skipping...`);
    return existing.rows[0].id;
  }
  
  const result = await pool.query(
    'INSERT INTO versions (name, description) VALUES ($1, $2) RETURNING id',
    [name, description]
  );
  
  console.log(`  ✓ Created version: ${name}`);
  return result.rows[0].id;
}

async function uploadFile(
  versionId: string,
  filename: string,
  fileType: 'ddl' | 'supporting_doc',
  uploadedBy: string,
  ragEngine: RAGEngine
): Promise<void> {
  // Check if file already exists
  const existing = await pool.query(
    'SELECT id FROM files WHERE version_id = $1 AND filename = $2',
    [versionId, filename]
  );
  
  if (existing.rows.length > 0) {
    console.log(`    File "${filename}" already exists, skipping...`);
    return;
  }
  
  const filePath = path.join(__dirname, 'seed-data', filename);
  const fileContent = fs.readFileSync(filePath);
  const fileSize = fileContent.length;
  
  // Upload to MinIO
  const storagePath = `${versionId}/${filename}`;
  const bucket = fileType === 'ddl' ? minioService.getDDLBucket() : minioService.getDocsBucket();
  const contentType = fileType === 'ddl' ? 'text/sql' : 'text/markdown';
  await minioService.uploadFile(bucket, storagePath, fileContent, fileSize, { 'Content-Type': contentType });
  
  // Save metadata to database and get file ID
  const fileResult = await pool.query(
    `INSERT INTO files (version_id, filename, file_type, storage_path, file_size, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [versionId, filename, fileType, storagePath, fileSize, uploadedBy]
  );
  
  const fileId = fileResult.rows[0].id;
  
  // Index in RAG engine
  const textContent = fileContent.toString('utf-8');
  await ragEngine.indexDocument(textContent, versionId, fileId, filename);
  
  console.log(`    ✓ Uploaded and indexed: ${filename}`);
}

async function seedDatabase() {
  let ragEngine: RAGEngine | null = null;
  
  try {
    console.log('=== Database Seeding ===\n');
    
    // Get admin user ID
    console.log('Getting admin user...');
    const adminUserId = await getAdminUserId();
    console.log(`✓ Admin user ID: ${adminUserId}\n`);
    
    // Initialize services
    console.log('Initializing services...');
    await minioService.initializeBuckets();
    
    ragEngine = new RAGEngine();
    console.log('✓ Services initialized\n');
    
    // Create sample versions and upload files
    for (const sample of SAMPLE_VERSIONS) {
      console.log(`Processing version: ${sample.name}`);
      
      const versionId = await createVersion(sample.name, sample.description);
      
      console.log('  Uploading files...');
      await uploadFile(versionId, sample.ddlFile, 'ddl', adminUserId, ragEngine);
      await uploadFile(versionId, sample.docFile, 'supporting_doc', adminUserId, ragEngine);
      
      console.log('');
    }
    
    console.log('=== Seeding Complete ===');
    console.log('\nSample versions created:');
    SAMPLE_VERSIONS.forEach(v => console.log(`  - ${v.name}`));
    console.log('\nYou can now test the system with these sample schemas!');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();
