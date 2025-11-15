# Error Handling and Logging System

This document describes the centralized error handling and logging system implemented for the NLP Code Generator.

## Overview

The system provides:
- Centralized error handling middleware
- Automatic error logging to database
- User-friendly error messages with suggestions
- Request ambiguity detection using LLM
- Admin endpoints for viewing error logs

## Components

### 1. Error Handler Middleware (`middleware/errorHandler.ts`)

#### AppError Class
Custom error class for application-specific errors:
```typescript
throw new AppError(
  'Error message',
  400, // HTTP status code
  'ERROR_CODE',
  ['Suggestion 1', 'Suggestion 2'], // Optional suggestions
  { detail: 'value' } // Optional details
);
```

#### Error Response Format
All errors follow a consistent format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly error message",
    "suggestions": ["Helpful suggestion 1", "Helpful suggestion 2"],
    "details": {} // Only in development mode
  }
}
```

#### Automatic Error Categorization
The middleware automatically categorizes errors based on error messages:
- Database errors → 503 DATABASE_ERROR
- LLM service errors → 503 LLM_SERVICE_UNAVAILABLE
- Timeout errors → 504 REQUEST_TIMEOUT
- Context/version errors → 404 NO_CONTEXT
- Storage errors → 503 STORAGE_ERROR
- Vector DB errors → 503 VECTOR_DB_ERROR
- Cache errors → 503 CACHE_ERROR
- Validation errors → 400 VALIDATION_ERROR
- Authentication errors → 401 AUTHENTICATION_ERROR
- Authorization errors → 403 AUTHORIZATION_ERROR
- Not found errors → 404 NOT_FOUND
- Generic errors → 500 INTERNAL_ERROR

#### Async Handler
Wrapper for async route handlers to catch errors:
```typescript
router.post('/endpoint', asyncHandler(async (req, res) => {
  // Your async code here
  // Errors are automatically caught and passed to error handler
}));
```

### 2. Request Clarification Logic (`services/GenerationService.ts`)

#### Two-Tier Ambiguity Detection

**Tier 1: Heuristic Checks (Fast)**
- Extremely short requests (< 10 characters)
- Vague pronouns at start (it, that, this, etc.)
- Multiple question marks (uncertainty)
- Missing key information (no SQL/workflow/form references)

**Tier 2: LLM-Based Analysis (Comprehensive)**
- Analyzes complex requests for ambiguity
- Identifies missing details
- Detects conflicting requirements
- Generates specific clarification prompts

#### Usage
```typescript
const ambiguityCheck = await generationService.detectAmbiguity(request);
if (ambiguityCheck.isAmbiguous) {
  throw new AppError(
    ambiguityCheck.clarificationPrompt!,
    400,
    'AMBIGUOUS_REQUEST',
    ['Provide more specific details']
  );
}
```

### 3. Error Logging

All errors are automatically logged to the database with:
- User ID (if authenticated)
- Request text
- Error message
- Stack trace
- Timestamp

Logging happens asynchronously and doesn't block the response.

### 4. Admin Error Log Endpoints

#### Get Recent Error Logs
```
GET /api/admin/error-logs?limit=50&offset=0
```

Response:
```json
{
  "errorLogs": [...],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 150,
    "hasMore": true
  }
}
```

#### Get Specific Error Log
```
GET /api/admin/error-logs/:id
```

#### Delete Old Error Logs
```
DELETE /api/admin/error-logs/old?days=30
```

Deletes error logs older than specified days.

## Integration

### In index.ts
```typescript
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// ... routes ...

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Centralized error handler - must be last
app.use(errorHandler);
```

### In Route Handlers
```typescript
import { AppError, asyncHandler } from '../middleware/errorHandler';

router.post('/endpoint', authenticate, asyncHandler(async (req, res) => {
  // Validation
  if (!req.body.field) {
    throw new AppError(
      'Field is required',
      400,
      'MISSING_FIELD',
      ['Provide the required field']
    );
  }

  // Business logic
  const result = await someService.doSomething();
  
  res.json(result);
}));
```

## Error Codes Reference

| Code | Status | Description |
|------|--------|-------------|
| INVALID_REQUEST | 400 | Request validation failed |
| INVALID_OUTPUT_TYPE | 400 | Invalid output type specified |
| INVALID_VERSION | 400 | Invalid version ID |
| AMBIGUOUS_REQUEST | 400 | Request needs clarification |
| VALIDATION_ERROR | 400 | Data validation failed |
| AUTHENTICATION_ERROR | 401 | Authentication failed |
| AUTHORIZATION_ERROR | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| NO_CONTEXT | 404 | No context for version |
| ROUTE_NOT_FOUND | 404 | API endpoint not found |
| INTERNAL_ERROR | 500 | Generic server error |
| DATABASE_ERROR | 503 | Database unavailable |
| LLM_SERVICE_UNAVAILABLE | 503 | LLM service unavailable |
| STORAGE_ERROR | 503 | File storage unavailable |
| VECTOR_DB_ERROR | 503 | Vector database unavailable |
| CACHE_ERROR | 503 | Cache service unavailable |
| REQUEST_TIMEOUT | 504 | Request took too long |

## Best Practices

1. **Use AppError for known errors**: Throw AppError with appropriate status codes and suggestions
2. **Let middleware handle unknown errors**: Don't catch errors unless you need to add context
3. **Use asyncHandler**: Wrap all async route handlers with asyncHandler
4. **Provide helpful suggestions**: Always include actionable suggestions in error responses
5. **Log context**: Include relevant request data when throwing errors
6. **Don't expose internals**: Details are only shown in development mode

## Testing Error Handling

### Test Validation Errors
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"request": "", "outputType": "sql", "versionId": "123"}'
```

### Test Ambiguous Requests
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"request": "it", "outputType": "sql", "versionId": "123"}'
```

### Test 404 Handler
```bash
curl http://localhost:3000/api/nonexistent
```

### View Error Logs (Admin)
```bash
curl http://localhost:3000/api/admin/error-logs \
  -H "Authorization: Bearer <admin-token>"
```
