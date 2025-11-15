# Authentication and Authorization System

This document describes the JWT-based authentication and role-based access control (RBAC) system implemented for the NLP Code Generator backend.

## Overview

The authentication system provides:
- User registration and login with JWT tokens
- Password hashing using bcrypt
- Token-based authentication middleware
- Role-based access control (user vs admin)

## Components

### 1. AuthService (`src/services/AuthService.ts`)

Handles all authentication logic:
- Password hashing and comparison
- JWT token generation and verification
- User registration and login

### 2. Authentication Middleware (`src/middleware/auth.ts`)

Provides three middleware functions:
- `authenticate`: Validates JWT tokens and attaches user info to request
- `requireAdmin`: Ensures the authenticated user has admin role
- `requireUser`: Ensures the user is authenticated (any role)

### 3. Auth Routes (`src/routes/auth.ts`)

Public endpoints:
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive JWT token
- `GET /api/auth/me` - Get current user info (requires authentication)

## Usage Examples

### 1. Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "role": "user"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user"
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user"
  }
}
```

### 3. Access Protected Endpoint

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Protecting Routes

### Require Authentication Only

```typescript
import { authenticate } from '../middleware/auth';

router.get('/protected', authenticate, async (req, res) => {
  // req.user is available here
  res.json({ user: req.user });
});
```

### Require Admin Role

```typescript
import { authenticate, requireAdmin } from '../middleware/auth';

router.post('/admin-only', authenticate, requireAdmin, async (req, res) => {
  // Only admins can access this
  res.json({ message: 'Admin access granted' });
});
```

### Require User Role (Any Authenticated User)

```typescript
import { authenticate, requireUser } from '../middleware/auth';

router.get('/user-data', authenticate, requireUser, async (req, res) => {
  // Both users and admins can access this
  res.json({ data: 'User data' });
});
```

## Request Object Extension

After authentication, the `req.user` object is available:

```typescript
interface Request {
  user?: {
    userId: string;
    email: string;
    role: 'user' | 'admin';
  };
}
```

## Environment Variables

Set the following in your `.env` file:

```
JWT_SECRET=your-secret-key-change-in-production
```

**Important**: Change the JWT_SECRET in production to a strong, random value.

## Token Expiration

JWT tokens expire after 24 hours by default. This can be configured in `AuthService.ts`:

```typescript
const JWT_EXPIRES_IN = '24h';
```

## Error Responses

### 401 Unauthorized
- No token provided
- Invalid token
- Token expired

### 403 Forbidden
- User doesn't have required role (e.g., admin access required)

### 409 Conflict
- User already exists during registration

### 400 Bad Request
- Invalid input (missing email/password, invalid format, etc.)

## Security Considerations

1. **Password Requirements**: Minimum 6 characters (can be increased)
2. **Password Hashing**: Uses bcrypt with 10 salt rounds
3. **Token Security**: JWT tokens should be stored securely on the client (e.g., httpOnly cookies or secure storage)
4. **HTTPS**: Always use HTTPS in production
5. **Secret Key**: Use a strong, random JWT_SECRET in production

## Testing

Example test scenarios:
1. Register a new user
2. Login with valid credentials
3. Login with invalid credentials
4. Access protected endpoint with valid token
5. Access protected endpoint without token
6. Access admin endpoint as regular user
7. Access admin endpoint as admin
