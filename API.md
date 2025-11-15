# API Documentation

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Error Responses](#error-responses)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Authentication](#authentication-endpoints)
  - [Code Generation](#code-generation-endpoints)
  - [Version Management](#version-management-endpoints)
  - [File Management](#file-management-endpoints)
  - [Request History](#request-history-endpoints)
  - [Admin](#admin-endpoints)
  - [Health Checks](#health-check-endpoints)

## Overview

The NLP Code Generator API is a RESTful API that enables natural language-based code generation for SQL queries, n8n workflows, and Form.io forms.

**Base URL**: `http://localhost:3000/api`

**Content Type**: All requests and responses use `application/json` unless otherwise specified (file uploads use `multipart/form-data`).

## Authentication

The API uses JWT (JSON Web Token) based authentication. After logging in, include the token in the `Authorization` header for all authenticated requests.

### Authentication Header

```
Authorization: Bearer <your-jwt-token>
```

### Token Expiration

JWT tokens expire after 24 hours. After expiration, you must log in again to obtain a new token.

### User Roles

- **user**: Can generate code, view history, and access versions
- **admin**: All user permissions plus file management, version management, and admin operations

## Error Responses

All error responses follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error details (development only)",
    "suggestions": ["Suggestion 1", "Suggestion 2"]
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `INTERNAL_ERROR` | 500 | Server error |
| `LLM_SERVICE_UNAVAILABLE` | 503 | LLM service is down |
| `GENERATION_TIMEOUT` | 504 | Generation took too long |

## Rate Limiting

Currently, no rate limiting is enforced. In production, consider implementing:
- 100 requests per hour per user for generation endpoints
- 1000 requests per hour for read-only endpoints


## Endpoints

---

## Authentication Endpoints

### Register User

Create a new user account.

**Endpoint**: `POST /api/auth/register`

**Authentication**: None

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "user"
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email address |
| `password` | string | Yes | Minimum 6 characters |
| `role` | string | No | Either "user" or "admin" (defaults to "user") |

**Success Response** (201 Created):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:
- `400 VALIDATION_ERROR`: Invalid email format or password too short
- `409 USER_EXISTS`: Email already registered

**Example**:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123"
  }'
```

---

### Login

Authenticate and receive a JWT token.

**Endpoint**: `POST /api/auth/login`

**Authentication**: None

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response** (200 OK):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:
- `400 VALIDATION_ERROR`: Missing email or password
- `401 INVALID_CREDENTIALS`: Incorrect email or password

**Example**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123"
  }'
```

---

### Get Current User

Get information about the currently authenticated user.

**Endpoint**: `GET /api/auth/me`

**Authentication**: Required (user or admin)

**Success Response** (200 OK):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: Missing or invalid token
- `404 USER_NOT_FOUND`: User no longer exists

**Example**:
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Code Generation Endpoints

### Generate Code

Generate SQL, n8n workflow, or Form.io form from natural language.

**Endpoint**: `POST /api/generate`

**Authentication**: Required (user or admin)

**Request Body**:
```json
{
  "request": "Get all active users with their orders from the last 30 days",
  "outputType": "sql",
  "versionId": "uuid-of-version"
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `request` | string | Yes | Natural language description |
| `outputType` | string | Yes | One of: "sql", "n8n", "formio" |
| `versionId` | string | Yes | UUID of the version context to use |

**Success Response** (200 OK):
```json
{
  "generatedCode": "SELECT u.*, o.* FROM users u JOIN orders o ON u.id = o.user_id WHERE u.status = 'active' AND o.created_at >= NOW() - INTERVAL '30 days';",
  "metadata": {
    "tokensUsed": 450,
    "processingTime": 2500,
    "contextFiles": ["schema_v1.sql", "api_docs.md"]
  },
  "requestId": "uuid-of-saved-request",
  "validation": {
    "isValid": true,
    "errors": [],
    "suggestions": []
  }
}
```

**Error Responses**:
- `400 INVALID_REQUEST`: Empty or invalid request text
- `400 INVALID_OUTPUT_TYPE`: Invalid output type
- `400 INVALID_VERSION`: Invalid or missing version ID
- `400 AMBIGUOUS_REQUEST`: Request needs clarification
- `404 NO_CONTEXT`: No DDL files found for version
- `503 LLM_SERVICE_UNAVAILABLE`: LLM service is down
- `504 GENERATION_TIMEOUT`: Generation exceeded 30 seconds

**Example**:
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Create a form with name, email, and phone number fields",
    "outputType": "formio",
    "versionId": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

---

## Version Management Endpoints

### List All Versions

Get all available software versions.

**Endpoint**: `GET /api/versions`

**Authentication**: Required (user or admin)

**Success Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "name": "v1.0.0",
    "description": "Initial release schema",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "uuid",
    "name": "v2.0.0",
    "description": "Updated schema with new tables",
    "createdAt": "2024-02-01T00:00:00.000Z",
    "updatedAt": "2024-02-01T00:00:00.000Z"
  }
]
```

**Example**:
```bash
curl -X GET http://localhost:3000/api/versions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Get Version by ID

Get details of a specific version.

**Endpoint**: `GET /api/versions/:versionId`

**Authentication**: Required (user or admin)

**Success Response** (200 OK):
```json
{
  "id": "uuid",
  "name": "v1.0.0",
  "description": "Initial release schema",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses**:
- `404 VERSION_NOT_FOUND`: Version does not exist

**Example**:
```bash
curl -X GET http://localhost:3000/api/versions/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Create Version

Create a new software version.

**Endpoint**: `POST /api/versions`

**Authentication**: Required (admin only)

**Request Body**:
```json
{
  "name": "v3.0.0",
  "description": "Major update with new features"
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique version name |
| `description` | string | No | Version description |

**Success Response** (201 Created):
```json
{
  "id": "uuid",
  "name": "v3.0.0",
  "description": "Major update with new features",
  "createdAt": "2024-03-01T00:00:00.000Z",
  "updatedAt": "2024-03-01T00:00:00.000Z"
}
```

**Error Responses**:
- `400 INVALID_INPUT`: Missing or invalid name
- `403 FORBIDDEN`: User is not an admin
- `409 VERSION_ALREADY_EXISTS`: Version name already exists

**Example**:
```bash
curl -X POST http://localhost:3000/api/versions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "v3.0.0",
    "description": "Major update"
  }'
```

---

### Update Version

Update an existing version.

**Endpoint**: `PUT /api/versions/:versionId`

**Authentication**: Required (admin only)

**Request Body**:
```json
{
  "name": "v3.0.1",
  "description": "Updated description"
}
```

**Success Response** (200 OK):
```json
{
  "id": "uuid",
  "name": "v3.0.1",
  "description": "Updated description",
  "createdAt": "2024-03-01T00:00:00.000Z",
  "updatedAt": "2024-03-02T00:00:00.000Z"
}
```

**Error Responses**:
- `400 INVALID_INPUT`: Invalid name format
- `403 FORBIDDEN`: User is not an admin
- `404 VERSION_NOT_FOUND`: Version does not exist
- `409 VERSION_ALREADY_EXISTS`: New name conflicts with existing version

**Example**:
```bash
curl -X PUT http://localhost:3000/api/versions/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description"
  }'
```

---

### Delete Version

Delete a version and all associated files.

**Endpoint**: `DELETE /api/versions/:versionId`

**Authentication**: Required (admin only)

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Version 'v3.0.0' deleted successfully"
}
```

**Error Responses**:
- `403 FORBIDDEN`: User is not an admin
- `404 VERSION_NOT_FOUND`: Version does not exist

**Example**:
```bash
curl -X DELETE http://localhost:3000/api/versions/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Warm Version Cache

Pre-load version context into cache for faster generation.

**Endpoint**: `POST /api/versions/:versionId/cache/warm`

**Authentication**: Required (admin only)

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Cache warmed for version 'v1.0.0'"
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/versions/123e4567-e89b-12d3-a456-426614174000/cache/warm \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Invalidate Version Cache

Clear cached data for a version.

**Endpoint**: `DELETE /api/versions/:versionId/cache`

**Authentication**: Required (admin only)

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Cache invalidated successfully"
}
```

**Example**:
```bash
curl -X DELETE http://localhost:3000/api/versions/123e4567-e89b-12d3-a456-426614174000/cache \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## File Management Endpoints

### Upload DDL File

Upload a DDL (Data Definition Language) file for a version.

**Endpoint**: `POST /api/versions/:versionId/ddl`

**Authentication**: Required (admin only)

**Content-Type**: `multipart/form-data`

**Form Data**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | SQL file (.sql extension required) |

**Success Response** (201 Created):
```json
{
  "message": "DDL file uploaded successfully",
  "file": {
    "id": "uuid",
    "versionId": "uuid",
    "filename": "schema.sql",
    "fileType": "ddl",
    "storagePath": "ddl/uuid/schema.sql",
    "fileSize": 15420,
    "uploadedBy": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:
- `400 NO_FILE`: No file provided
- `400 INVALID_FILE_TYPE`: File must have .sql extension
- `403 FORBIDDEN`: User is not an admin
- `500 UPLOAD_FAILED`: File upload or validation failed

**Example**:
```bash
curl -X POST http://localhost:3000/api/versions/123e4567-e89b-12d3-a456-426614174000/ddl \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@schema.sql"
```

---

### Upload Supporting Documents

Upload supporting documentation files for a version.

**Endpoint**: `POST /api/versions/:versionId/docs`

**Authentication**: Required (admin only)

**Content-Type**: `multipart/form-data`

**Form Data**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `files` | file[] | Yes | Up to 10 files (PDF, MD, TXT) |

**Success Response** (201 Created):
```json
{
  "message": "Successfully uploaded 2 file(s)",
  "files": [
    {
      "id": "uuid",
      "versionId": "uuid",
      "filename": "api_docs.md",
      "fileType": "supporting_doc",
      "storagePath": "docs/uuid/api_docs.md",
      "fileSize": 8420,
      "uploadedBy": "uuid",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "uuid",
      "versionId": "uuid",
      "filename": "business_rules.pdf",
      "fileType": "supporting_doc",
      "storagePath": "docs/uuid/business_rules.pdf",
      "fileSize": 125000,
      "uploadedBy": "uuid",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "errors": []
}
```

**Error Responses**:
- `400 NO_FILES`: No files provided
- `400 ALL_UPLOADS_FAILED`: All file uploads failed
- `403 FORBIDDEN`: User is not an admin

**Example**:
```bash
curl -X POST http://localhost:3000/api/versions/123e4567-e89b-12d3-a456-426614174000/docs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@api_docs.md" \
  -F "files=@business_rules.pdf"
```

---

### List Version Files

Get all files associated with a version.

**Endpoint**: `GET /api/versions/:versionId/files`

**Authentication**: Required (user or admin)

**Success Response** (200 OK):
```json
{
  "versionId": "uuid",
  "files": [
    {
      "id": "uuid",
      "versionId": "uuid",
      "filename": "schema.sql",
      "fileType": "ddl",
      "storagePath": "ddl/uuid/schema.sql",
      "fileSize": 15420,
      "uploadedBy": "uuid",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "uuid",
      "versionId": "uuid",
      "filename": "api_docs.md",
      "fileType": "supporting_doc",
      "storagePath": "docs/uuid/api_docs.md",
      "fileSize": 8420,
      "uploadedBy": "uuid",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 2
}
```

**Example**:
```bash
curl -X GET http://localhost:3000/api/versions/123e4567-e89b-12d3-a456-426614174000/files \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Delete File

Delete a file by ID.

**Endpoint**: `DELETE /api/files/:fileId`

**Authentication**: Required (admin only)

**Success Response** (200 OK):
```json
{
  "message": "File deleted successfully",
  "fileId": "uuid"
}
```

**Error Responses**:
- `403 FORBIDDEN`: User is not an admin
- `404 FILE_NOT_FOUND`: File does not exist
- `500 DELETE_FAILED`: File deletion failed

**Example**:
```bash
curl -X DELETE http://localhost:3000/api/files/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Request History Endpoints

### Get Request History

Get paginated request history with optional filtering.

**Endpoint**: `GET /api/history`

**Authentication**: Required (user or admin)

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | Results per page (1-100, default: 50) |
| `offset` | number | No | Number of results to skip (default: 0) |
| `outputType` | string | No | Filter by: "sql", "n8n", or "formio" |
| `versionId` | string | No | Filter by version UUID |

**Success Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "versionId": "uuid",
      "requestText": "Get all active users",
      "outputType": "sql",
      "generatedCode": "SELECT * FROM users WHERE status = 'active';",
      "tokensUsed": 250,
      "processingTimeMs": 1500,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 125,
    "hasMore": true
  }
}
```

**Error Responses**:
- `400 INVALID_LIMIT`: Limit out of range
- `400 INVALID_OFFSET`: Negative offset
- `400 INVALID_OUTPUT_TYPE`: Invalid output type filter

**Example**:
```bash
curl -X GET "http://localhost:3000/api/history?limit=10&outputType=sql" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Get Single Request

Get details of a specific request by ID.

**Endpoint**: `GET /api/history/:requestId`

**Authentication**: Required (user or admin)

**Success Response** (200 OK):
```json
{
  "id": "uuid",
  "userId": "uuid",
  "versionId": "uuid",
  "requestText": "Get all active users",
  "outputType": "sql",
  "generatedCode": "SELECT * FROM users WHERE status = 'active';",
  "tokensUsed": 250,
  "processingTimeMs": 1500,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses**:
- `400 INVALID_REQUEST_ID`: Invalid UUID format
- `403 FORBIDDEN`: Request belongs to another user
- `404 REQUEST_NOT_FOUND`: Request does not exist

**Example**:
```bash
curl -X GET http://localhost:3000/api/history/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Resubmit Request

Resubmit a previous request with optional modifications.

**Endpoint**: `POST /api/history/:requestId/resubmit`

**Authentication**: Required (user or admin)

**Request Body**:
```json
{
  "modifications": "Get all active users ordered by registration date"
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `modifications` | string | No | Modified request text (uses original if omitted) |

**Success Response** (200 OK):
```json
{
  "generatedCode": "SELECT * FROM users WHERE status = 'active' ORDER BY created_at DESC;",
  "metadata": {
    "tokensUsed": 280,
    "processingTime": 1800,
    "contextFiles": ["schema_v1.sql"]
  },
  "requestId": "uuid-of-new-request",
  "originalRequestId": "uuid-of-original-request",
  "validation": {
    "isValid": true,
    "errors": [],
    "suggestions": []
  }
}
```

**Error Responses**:
- `400 INVALID_REQUEST_ID`: Invalid UUID format
- `400 AMBIGUOUS_REQUEST`: Request needs clarification
- `403 FORBIDDEN`: Request belongs to another user
- `404 REQUEST_NOT_FOUND`: Original request does not exist
- `503 LLM_SERVICE_UNAVAILABLE`: LLM service is down

**Example**:
```bash
curl -X POST http://localhost:3000/api/history/123e4567-e89b-12d3-a456-426614174000/resubmit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modifications": "Get all active users with their email addresses"
  }'
```

---

## Admin Endpoints

### Get Error Logs

Get recent error logs (admin only).

**Endpoint**: `GET /api/admin/error-logs`

**Authentication**: Required (admin only)

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | Results per page (1-500, default: 50) |
| `offset` | number | No | Number of results to skip (default: 0) |

**Success Response** (200 OK):
```json
{
  "errorLogs": [
    {
      "id": "uuid",
      "userId": "uuid",
      "requestText": "Invalid request",
      "errorMessage": "LLM service unavailable",
      "errorStack": "Error: Connection timeout...",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 25,
    "hasMore": false
  }
}
```

**Error Responses**:
- `400 INVALID_LIMIT`: Limit out of range
- `400 INVALID_OFFSET`: Negative offset
- `403 FORBIDDEN`: User is not an admin

**Example**:
```bash
curl -X GET "http://localhost:3000/api/admin/error-logs?limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Get Error Log by ID

Get a specific error log by ID (admin only).

**Endpoint**: `GET /api/admin/error-logs/:id`

**Authentication**: Required (admin only)

**Success Response** (200 OK):
```json
{
  "id": "uuid",
  "userId": "uuid",
  "requestText": "Invalid request",
  "errorMessage": "LLM service unavailable",
  "errorStack": "Error: Connection timeout...",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses**:
- `403 FORBIDDEN`: User is not an admin
- `404 ERROR_LOG_NOT_FOUND`: Error log does not exist

**Example**:
```bash
curl -X GET http://localhost:3000/api/admin/error-logs/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Delete Old Error Logs

Delete error logs older than specified days (admin only).

**Endpoint**: `DELETE /api/admin/error-logs/old`

**Authentication**: Required (admin only)

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `days` | number | No | Delete logs older than this (default: 30) |

**Success Response** (200 OK):
```json
{
  "message": "Successfully deleted error logs older than 30 days",
  "deletedCount": 150
}
```

**Error Responses**:
- `400 INVALID_DAYS`: Days must be at least 1
- `403 FORBIDDEN`: User is not an admin

**Example**:
```bash
curl -X DELETE "http://localhost:3000/api/admin/error-logs/old?days=60" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Health Check Endpoints

### Comprehensive Health Check

Check the health of all services.

**Endpoint**: `GET /api/health`

**Authentication**: None

**Success Response** (200 OK - Healthy):
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": {
      "status": "up",
      "responseTime": 15
    },
    "redis": {
      "status": "up",
      "responseTime": 8
    },
    "minio": {
      "status": "up",
      "responseTime": 12
    },
    "qdrant": {
      "status": "up",
      "responseTime": 20
    }
  },
  "uptime": 3600.5
}
```

**Degraded Response** (200 OK - Degraded):
```json
{
  "status": "degraded",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": {
      "status": "up",
      "responseTime": 15
    },
    "redis": {
      "status": "down",
      "responseTime": 5000,
      "error": "Connection timeout"
    },
    "minio": {
      "status": "up",
      "responseTime": 12
    },
    "qdrant": {
      "status": "up",
      "responseTime": 20
    }
  },
  "uptime": 3600.5
}
```

**Unhealthy Response** (503 Service Unavailable):
```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": {
      "status": "down",
      "responseTime": 5000,
      "error": "Connection refused"
    },
    "redis": {
      "status": "up",
      "responseTime": 8
    },
    "minio": {
      "status": "up",
      "responseTime": 12
    },
    "qdrant": {
      "status": "up",
      "responseTime": 20
    }
  },
  "uptime": 3600.5
}
```

**Example**:
```bash
curl -X GET http://localhost:3000/api/health
```

---

### Liveness Probe

Simple check that the service is running.

**Endpoint**: `GET /api/health/live`

**Authentication**: None

**Success Response** (200 OK):
```json
{
  "status": "alive",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Example**:
```bash
curl -X GET http://localhost:3000/api/health/live
```

---

### Readiness Probe

Check if the service is ready to accept traffic.

**Endpoint**: `GET /api/health/ready`

**Authentication**: None

**Success Response** (200 OK):
```json
{
  "status": "ready",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Not Ready Response** (503 Service Unavailable):
```json
{
  "status": "not_ready",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "reason": "Database not available"
}
```

**Example**:
```bash
curl -X GET http://localhost:3000/api/health/ready
```

---

## Complete Usage Examples

### Example 1: User Registration and Code Generation

```bash
# 1. Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "password": "securepass123"
  }'

# Response:
# {
#   "user": { "id": "...", "email": "developer@example.com", "role": "user" },
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# }

# 2. Save the token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 3. Get available versions
curl -X GET http://localhost:3000/api/versions \
  -H "Authorization: Bearer $TOKEN"

# 4. Generate SQL code
curl -X POST http://localhost:3000/api/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Get all orders placed in the last 7 days with customer details",
    "outputType": "sql",
    "versionId": "version-uuid-here"
  }'

# 5. View request history
curl -X GET http://localhost:3000/api/history \
  -H "Authorization: Bearer $TOKEN"
```

---

### Example 2: Admin File Management

```bash
# 1. Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'

# Save admin token
ADMIN_TOKEN="admin-jwt-token-here"

# 2. Create a new version
curl -X POST http://localhost:3000/api/versions \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "v2.0.0",
    "description": "Updated schema with new tables"
  }'

# Response includes version ID
VERSION_ID="new-version-uuid"

# 3. Upload DDL file
curl -X POST http://localhost:3000/api/versions/$VERSION_ID/ddl \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@database_schema.sql"

# 4. Upload supporting documents
curl -X POST http://localhost:3000/api/versions/$VERSION_ID/docs \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "files=@api_documentation.md" \
  -F "files=@business_rules.pdf"

# 5. List all files for the version
curl -X GET http://localhost:3000/api/versions/$VERSION_ID/files \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 6. Warm cache for faster generation
curl -X POST http://localhost:3000/api/versions/$VERSION_ID/cache/warm \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

### Example 3: Working with Request History

```bash
# 1. Get paginated history
curl -X GET "http://localhost:3000/api/history?limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN"

# 2. Filter by output type
curl -X GET "http://localhost:3000/api/history?outputType=sql" \
  -H "Authorization: Bearer $TOKEN"

# 3. Filter by version
curl -X GET "http://localhost:3000/api/history?versionId=version-uuid" \
  -H "Authorization: Bearer $TOKEN"

# 4. Get specific request
curl -X GET http://localhost:3000/api/history/request-uuid \
  -H "Authorization: Bearer $TOKEN"

# 5. Resubmit with modifications
curl -X POST http://localhost:3000/api/history/request-uuid/resubmit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modifications": "Get all orders with customer details, sorted by date"
  }'
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
// API Client Setup
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Login
async function login(email: string, password: string) {
  const response = await apiClient.post('/auth/login', { email, password });
  localStorage.setItem('token', response.data.token);
  return response.data.user;
}

// Generate Code
async function generateCode(request: string, outputType: string, versionId: string) {
  const response = await apiClient.post('/generate', {
    request,
    outputType,
    versionId,
  });
  return response.data;
}

// Get History
async function getHistory(limit = 50, offset = 0) {
  const response = await apiClient.get('/history', {
    params: { limit, offset },
  });
  return response.data;
}

// Upload DDL File
async function uploadDDL(versionId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await apiClient.post(`/versions/${versionId}/ddl`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}
```

---

### Python

```python
import requests
from typing import Optional, Dict, Any

class NLPCodeGeneratorClient:
    def __init__(self, base_url: str = "http://localhost:3000/api"):
        self.base_url = base_url
        self.token: Optional[str] = None
    
    def login(self, email: str, password: str) -> Dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password}
        )
        response.raise_for_status()
        data = response.json()
        self.token = data["token"]
        return data["user"]
    
    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers
    
    def generate_code(self, request: str, output_type: str, version_id: str) -> Dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/generate",
            json={
                "request": request,
                "outputType": output_type,
                "versionId": version_id
            },
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()
    
    def get_versions(self) -> list:
        response = requests.get(
            f"{self.base_url}/versions",
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()
    
    def get_history(self, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        response = requests.get(
            f"{self.base_url}/history",
            params={"limit": limit, "offset": offset},
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()

# Usage
client = NLPCodeGeneratorClient()
client.login("user@example.com", "password123")

# Generate SQL
result = client.generate_code(
    request="Get all active users",
    output_type="sql",
    version_id="version-uuid"
)
print(result["generatedCode"])
```

---

## Webhooks and Events

Currently, the API does not support webhooks or event notifications. Future versions may include:
- Webhook notifications for completed generations
- Real-time updates via WebSockets
- Event streaming for admin monitoring

---

## Versioning

The API is currently at version 1.0. Future versions will be indicated in the URL path (e.g., `/api/v2/`).

---

## Support

For API issues or questions:
- Check the [Troubleshooting](./README.md#troubleshooting) section
- Review error messages and suggestions in responses
- Contact support with request IDs for faster resolution
