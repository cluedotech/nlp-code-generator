// TypeScript interfaces for database entities

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface Version {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileMetadata {
  id: string;
  versionId: string;
  filename: string;
  fileType: 'ddl' | 'supporting_doc';
  storagePath: string;
  fileSize: number;
  uploadedBy: string | null;
  createdAt: Date;
}

export interface RequestHistory {
  id: string;
  userId: string;
  versionId: string;
  requestText: string;
  outputType: 'sql' | 'n8n' | 'formio';
  generatedCode: string;
  tokensUsed: number | null;
  processingTimeMs: number | null;
  createdAt: Date;
}

export interface ErrorLog {
  id: string;
  userId: string | null;
  requestText: string | null;
  errorMessage: string;
  errorStack: string | null;
  createdAt: Date;
}

// DTOs for creating entities (without auto-generated fields)
export interface CreateUserDTO {
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
}

export interface CreateVersionDTO {
  name: string;
  description?: string;
}

export interface CreateFileMetadataDTO {
  versionId: string;
  filename: string;
  fileType: 'ddl' | 'supporting_doc';
  storagePath: string;
  fileSize: number;
  uploadedBy?: string;
}

export interface CreateRequestHistoryDTO {
  userId: string;
  versionId: string;
  requestText: string;
  outputType: 'sql' | 'n8n' | 'formio';
  generatedCode: string;
  tokensUsed?: number;
  processingTimeMs?: number;
}

export interface CreateErrorLogDTO {
  userId?: string;
  requestText?: string;
  errorMessage: string;
  errorStack?: string;
}
