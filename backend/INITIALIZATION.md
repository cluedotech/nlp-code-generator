# Database Initialization and Seeding

This document explains how to initialize the database and populate it with sample data for testing.

## Overview

The system provides two main scripts for database setup:

1. **Initialization** (`init`): Runs migrations and creates a default admin user
2. **Seeding** (`seed`): Populates the database with sample versions and files for testing

## Initialization

### What it does

The initialization script:
- Runs all database migrations to create tables and indexes
- Creates a default admin user if one doesn't exist
- Ensures the database is ready for use

### Running initialization

**Development (with TypeScript):**
```bash
npm run init
```

**Production (compiled JavaScript):**
```bash
npm run init:prod
```

### Default Admin Credentials

The default admin user is created with the following credentials:

- **Email**: `admin@example.com` (configurable via `DEFAULT_ADMIN_EMAIL` env var)
- **Password**: `admin123` (configurable via `DEFAULT_ADMIN_PASSWORD` env var)

⚠️ **IMPORTANT**: Change the default password immediately after first login in production!

### Configuration

You can customize the default admin credentials by setting environment variables:

```bash
DEFAULT_ADMIN_EMAIL=your-admin@company.com
DEFAULT_ADMIN_PASSWORD=your-secure-password
```

## Seeding

### What it does

The seeding script:
- Creates sample software versions
- Uploads sample DDL files to MinIO
- Uploads sample documentation files to MinIO
- Indexes all files in the RAG engine (Qdrant)

### Sample Data Included

#### 1. E-commerce v1.0
- **DDL**: Complete e-commerce database schema
  - Customers table
  - Products table
  - Orders table
  - Order items table
- **Documentation**: Business rules, common queries, integration points

#### 2. HR System v1.0
- **DDL**: Human resources management schema
  - Departments table
  - Employees table
  - Attendance table
  - Leave requests table
- **Documentation**: Business rules, reporting structure, compliance notes

### Running seeding

**Prerequisites:**
- Database must be initialized first (`npm run init`)
- All services must be running (PostgreSQL, MinIO, Qdrant, Redis)
- At least one admin user must exist

**Development (with TypeScript):**
```bash
npm run seed
```

**Production (compiled JavaScript):**
```bash
npm run seed:prod
```

### Idempotency

Both scripts are idempotent:
- **Initialization**: Won't create duplicate admin users
- **Seeding**: Won't create duplicate versions or files

You can safely run them multiple times.

## Docker Deployment

### Automatic Initialization

When using Docker, the backend container automatically runs initialization on startup via the `startup.sh` script:

1. Waits for database to be ready
2. Runs initialization (migrations + default admin user)
3. Starts the application

### Manual Seeding in Docker

To seed the database in a Docker environment:

```bash
# Enter the backend container
docker-compose exec backend sh

# Run the seed script
npm run seed:prod

# Exit the container
exit
```

## Complete Setup Flow

### Development

```bash
# 1. Start all services
docker-compose up -d

# 2. Wait for services to be ready (check logs)
docker-compose logs -f backend

# 3. Initialize database (if not auto-initialized)
cd backend
npm run init

# 4. Seed sample data
npm run seed

# 5. Access the application
# Login with admin@example.com / admin123
```

### Production

```bash
# 1. Set environment variables
export DEFAULT_ADMIN_EMAIL=admin@yourcompany.com
export DEFAULT_ADMIN_PASSWORD=your-secure-password

# 2. Start services
docker-compose up -d

# 3. Initialization happens automatically on startup

# 4. Optionally seed sample data
docker-compose exec backend npm run seed:prod
```

## Troubleshooting

### "No admin user found" error during seeding

**Solution**: Run initialization first:
```bash
npm run init
```

### "Database connection failed"

**Solution**: Ensure PostgreSQL is running and `DATABASE_URL` is correct:
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check connection string
echo $DATABASE_URL
```

### "MinIO connection failed" during seeding

**Solution**: Ensure MinIO is running and accessible:
```bash
# Check if MinIO is running
docker-compose ps minio

# Check MinIO configuration
echo $MINIO_ENDPOINT
echo $MINIO_PORT
```

### "Qdrant connection failed" during seeding

**Solution**: Ensure Qdrant is running:
```bash
# Check if Qdrant is running
docker-compose ps qdrant

# Check Qdrant URL
echo $QDRANT_URL
```

## File Structure

```
backend/src/migrations/
├── 001_initial_schema.sql    # Database schema
├── run.ts                     # Migration runner (legacy)
├── init.ts                    # Initialization script
├── seed.ts                    # Seeding script
└── seed-data/                 # Sample data files
    ├── sample-ddl-ecommerce.sql
    ├── sample-ddl-hr.sql
    ├── sample-doc-ecommerce.md
    └── sample-doc-hr.md
```

## Security Notes

1. **Change default credentials**: Always change the default admin password in production
2. **Secure environment variables**: Use secrets management for production credentials
3. **Limit seeding**: Only run seeding in development/testing environments
4. **Review sample data**: Sample data is for testing only, not production use
