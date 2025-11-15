// Shared TypeScript types between frontend and backend

export type OutputType = 'sql' | 'n8n' | 'formio';
export type UserRole = 'user' | 'admin';
export type FileType = 'ddl' | 'supporting_doc';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Version {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileMetadata {
  id: string;
  versionId: string;
  filename: string;
  fileType: FileType;
  storagePath: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: Date;
}

export interface RequestHistory {
  id: string;
  userId: string;
  versionId: string;
  requestText: string;
  outputType: OutputType;
  generatedCode: string;
  tokensUsed: number;
  processingTimeMs: number;
  createdAt: Date;
}

export interface GenerationRequest {
  request: string;
  outputType: OutputType;
  versionId: string;
}

export interface GenerationResult {
  generatedCode: string;
  metadata: {
    tokensUsed: number;
    processingTime: number;
    contextFiles: string[];
  };
  requestId: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    suggestions?: string[];
  };
}
