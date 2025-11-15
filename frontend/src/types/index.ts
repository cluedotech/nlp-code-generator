export type OutputType = 'sql' | 'n8n' | 'formio';

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

export interface Version {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileMetadata {
  id: string;
  versionId: string;
  filename: string;
  fileType: 'ddl' | 'supporting_doc';
  storagePath: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
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
  createdAt: string;
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

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    suggestions?: string[];
  };
}
