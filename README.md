# NLP Code Generator

> Transform natural language into production-ready code using AI and RAG technology

A full-stack web application that generates SQL queries, n8n workflows, and Form.io forms from natural language descriptions. Built with React, Node.js, and powered by OpenAI's GPT models with Retrieval-Augmented Generation (RAG) for context-aware code generation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

## ✨ Features

- 🤖 **AI-Powered Generation**: Leverages OpenAI GPT models for intelligent code generation
- 📚 **RAG Technology**: Uses vector embeddings and semantic search for context-aware results
- 🗄️ **Version Management**: Support multiple software versions with version-specific schemas
- 📝 **Multiple Output Types**: Generate SQL queries, n8n workflows, or Form.io forms
- 🔐 **Secure Authentication**: JWT-based auth with role-based access control
- 📊 **Request History**: Track and resubmit previous generation requests
- 🎯 **Admin Dashboard**: Manage versions, upload DDL files and documentation
- 🐳 **Docker Ready**: Complete containerized deployment with Docker Compose
- ⚡ **High Performance**: Redis caching and optimized vector search

## 🎬 Demo

![NLP Code Generator Demo](docs/demo.gif)

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   React     │────▶│   Express    │────▶│   OpenAI    │
│  Frontend   │     │   Backend    │     │     API     │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ├──────▶ PostgreSQL (Metadata)
                           ├──────▶ Redis (Cache)
                           ├──────▶ MinIO (File Storage)
                           └──────▶ Qdrant (Vector DB)
```

## 🚀 Quick Start

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Services](#services)
- [Usage](#usage)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Additional Documentation](#additional-documentation)

## Overview

The NLP Code Generator enables users to:
- Generate SQL queries from natural language descriptions
- Create n8n workflow JSON configurations
- Build Form.io form definitions
- Manage multiple software versions with version-specific DDL files and documentation
- Leverage RAG technology for context-aware code generation

The system stores DDL files and supporting documentation in the backend, eliminating the need for users to upload context files with each request.

## Prerequisites

### Required
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **LLM API Access**: One of the following:
  - OpenAI API key (recommended for production)
  - Local Ollama installation (for offline/development use)
  - Any OpenAI-compatible API endpoint

### System Requirements
- **RAM**: Minimum 4GB, recommended 8GB+
- **Disk Space**: Minimum 10GB for Docker images and data volumes
- **CPU**: 2+ cores recommended
- **OS**: Linux, macOS, or Windows with WSL2

### Verify Prerequisites

```bash
# Check Docker version
docker --version
# Should show: Docker version 20.10.0 or higher

# Check Docker Compose version
docker-compose --version
# Should show: Docker Compose version 2.0.0 or higher

# Verify Docker is running
docker ps
# Should show running containers or empty list (no errors)
```

## Quick Start

### 1. Clone and Navigate

```bash
git clone <repository-url>
cd nlp-code-generator
```

### 2. Configure Environment

Copy the environment template:
```bash
cp .env.example .env
```

Edit `.env` and configure your LLM API key:
```bash
# For OpenAI
LLM_API_KEY=sk-your-openai-api-key-here
LLM_API_URL=https://api.openai.com/v1

# OR for local Ollama
# LLM_API_URL=http://host.docker.internal:11434/v1
# LLM_API_KEY=ollama
```

**Important**: Change the default passwords and secrets in production:
```bash
JWT_SECRET=your-secure-random-string-here
POSTGRES_PASSWORD=your-secure-database-password
DEFAULT_ADMIN_PASSWORD=your-secure-admin-password
```

### 3. Start Services

```bash
# Start all services in detached mode
docker-compose up -d

# View logs (optional)
docker-compose logs -f
```

### 4. Initialize Database

The database is automatically initialized on first startup. To verify:
```bash
# Check backend logs for migration success
docker-compose logs backend | grep -i migration
```

### 5. Populate Demo Data (Optional)

Load sample versions with DDL files and documentation to test the system:

```bash
# Seed the database with demo data
docker-compose exec backend npm run seed:prod
```

This creates two sample versions:
- **E-commerce v1.0**: E-commerce platform with customers, products, and orders
- **HR System v1.0**: HR management system with employees, departments, and attendance

Each version includes:
- Sample DDL file (database schema)
- Supporting documentation
- Pre-indexed embeddings for RAG

You can now test generation requests like:
- "Get all active customers with their orders"
- "Show employees by department with their attendance records"

### 6. Access the Application

- **Frontend**: https://localhost (HTTP redirects to HTTPS)
- **Backend API**: http://localhost:3000
- **MinIO Console**: http://localhost:9001 (credentials: minioadmin/minioadmin)
- **Qdrant Dashboard**: http://localhost:6333/dashboard

**Note**: The frontend uses self-signed SSL certificates for development. Your browser will show a security warning:
- Click "Advanced" → "Proceed to localhost" (Chrome)
- Click "Advanced" → "Accept the Risk and Continue" (Firefox)

### 7. Login

Default admin credentials:
- **Email**: admin@example.com
- **Password**: admin123

**⚠️ Change these credentials immediately after first login!**

## Environment Variables

### Database Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `POSTGRES_DB` | PostgreSQL database name | `nlpgen` | Yes |
| `POSTGRES_USER` | PostgreSQL username | `nlpuser` | Yes |
| `POSTGRES_PASSWORD` | PostgreSQL password | `nlppass` | Yes |

### MinIO Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MINIO_ENDPOINT` | MinIO server endpoint | `minio` | Yes |
| `MINIO_PORT` | MinIO server port | `9000` | Yes |
| `MINIO_USE_SSL` | Use SSL for MinIO | `false` | Yes |
| `MINIO_ROOT_USER` | MinIO admin username | `minioadmin` | Yes |
| `MINIO_ROOT_PASSWORD` | MinIO admin password | `minioadmin` | Yes |

### Backend Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret key for JWT tokens | - | Yes |
| `DEFAULT_ADMIN_EMAIL` | Initial admin email | `admin@example.com` | Yes |
| `DEFAULT_ADMIN_PASSWORD` | Initial admin password | `admin123` | Yes |

### LLM Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `LLM_API_KEY` | API key for LLM service | - | Yes |
| `LLM_API_URL` | LLM API endpoint | `https://api.openai.com/v1` | Yes |
| `EMBEDDING_MODEL` | Embedding model name | `text-embedding-3-small` | No |
| `EMBEDDING_DIMENSIONS` | Embedding vector dimensions | `1536` | No |

### Qdrant Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `QDRANT_URL` | Qdrant server URL | `http://qdrant:6333` | Yes |
| `QDRANT_API_KEY` | Qdrant API key (optional) | - | No |

### Redis Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_URL` | Redis connection URL | `redis://redis:6379` | Yes |

## Project Structure

```
nlp-code-generator/
├── backend/                    # Node.js/Express backend
│   ├── src/
│   │   ├── index.ts           # Application entry point
│   │   ├── db/                # Database connection
│   │   ├── middleware/        # Auth & error handling
│   │   ├── migrations/        # Database migrations & seeds
│   │   ├── models/            # TypeScript data models
│   │   ├── repositories/      # Data access layer
│   │   ├── routes/            # API endpoints
│   │   └── services/          # Business logic
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── App.tsx            # Main app component
│   │   ├── components/        # React components
│   │   ├── contexts/          # React contexts
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # API client
│   │   ├── pages/             # Page components
│   │   └── types/             # TypeScript types
│   ├── Dockerfile
│   ├── nginx.conf             # Nginx configuration
│   ├── package.json
│   └── vite.config.ts
├── shared/                     # Shared TypeScript types
│   └── types.ts
├── .kiro/                      # Kiro specs and documentation
│   └── specs/
│       └── nlp-code-generator/
├── docker-compose.yml          # Service orchestration
├── .env.example               # Environment template
└── README.md                  # This file
```

## Services

The application consists of six containerized services:

### Frontend (Port 80/443)
- **Technology**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS
- **Code Editor**: Monaco Editor
- **State Management**: TanStack Query
- **Web Server**: Nginx with HTTPS

### Backend (Port 3000)
- **Technology**: Node.js + Express + TypeScript
- **Authentication**: JWT-based auth with bcrypt
- **API**: RESTful endpoints
- **Health Checks**: `/health/live` and `/health/ready`

### PostgreSQL (Port 5432)
- **Version**: PostgreSQL 15 Alpine
- **Purpose**: Stores users, versions, files metadata, request history
- **Volume**: `postgres-data` for persistence

### Redis (Port 6379)
- **Version**: Redis 7 Alpine
- **Purpose**: Caching layer for version contexts and DDL files
- **Volume**: `redis-data` for persistence

### MinIO (Ports 9000, 9001)
- **Version**: Latest
- **Purpose**: S3-compatible object storage for DDL files and documents
- **Console**: http://localhost:9001
- **Volume**: `minio-data` for persistence

### Qdrant (Port 6333)
- **Version**: Latest
- **Purpose**: Vector database for RAG document embeddings
- **Dashboard**: http://localhost:6333/dashboard
- **Volume**: `qdrant-data` for persistence

## Usage

### For Users

1. **Login**: Navigate to https://localhost and login with your credentials
2. **Select Version**: Choose the software version from the dropdown
3. **Enter Request**: Type your natural language request (e.g., "Get all active users with their orders")
4. **Select Output Type**: Choose SQL, n8n, or Form.io
5. **Generate**: Click "Generate" and wait for the result
6. **Copy/Download**: Use the copy or download buttons to save the generated code
7. **View History**: Access your previous requests from the History page

### For Administrators

1. **Login as Admin**: Use admin credentials
2. **Navigate to Admin Panel**: Click "Admin" in the navigation
3. **Create Version**: Add a new software version
4. **Upload DDL Files**: Upload database schema files for the version
5. **Upload Documentation**: Add supporting documents (API docs, business rules, etc.)
6. **Manage Files**: View, download, or delete existing files

## Development

### Running Without Docker

#### Backend Development

```bash
cd backend
npm install

# Set environment variables
export DATABASE_URL="postgresql://nlpuser:nlppass@localhost:5432/nlpgen"
export REDIS_URL="redis://localhost:6379"
export MINIO_ENDPOINT="localhost"
export MINIO_PORT="9000"
export MINIO_ACCESS_KEY="minioadmin"
export MINIO_SECRET_KEY="minioadmin"
export QDRANT_URL="http://localhost:6333"
export JWT_SECRET="dev-secret"
export LLM_API_KEY="your-key"

# Run migrations
npm run migrate

# Start development server
npm run dev
```

#### Frontend Development

```bash
cd frontend
npm install

# Start development server (proxies API to localhost:3000)
npm run dev
```

### Rebuilding Containers

After code changes:
```bash
# Rebuild and restart specific service
docker-compose up -d --build backend

# Rebuild all services
docker-compose up -d --build
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Database Management

```bash
# Access PostgreSQL CLI
docker-compose exec postgres psql -U nlpuser -d nlpgen

# Run migrations manually
docker-compose exec backend npm run migrate

# Seed demo data (production build)
docker-compose exec backend npm run seed:prod

# Seed demo data (development)
cd backend && npm run seed
```

**Demo Data Includes**:
- E-commerce v1.0: Customer, product, and order management schema
- HR System v1.0: Employee, department, and attendance tracking schema
- Sample DDL files and supporting documentation
- Pre-indexed vector embeddings for RAG context retrieval

## Troubleshooting

### Services Won't Start

**Problem**: `docker-compose up` fails or services crash

**Solutions**:
1. Check Docker is running: `docker ps`
2. Check port conflicts: `lsof -i :80,443,3000,5432,6379,9000,9001,6333`
3. View service logs: `docker-compose logs <service-name>`
4. Remove old containers: `docker-compose down && docker-compose up -d`
5. Check disk space: `df -h`

### Database Connection Errors

**Problem**: Backend can't connect to PostgreSQL

**Solutions**:
1. Verify PostgreSQL is healthy: `docker-compose ps postgres`
2. Check credentials in `.env` match `docker-compose.yml`
3. Wait for PostgreSQL to be ready (check logs): `docker-compose logs postgres`
4. Restart backend: `docker-compose restart backend`

### LLM API Errors

**Problem**: "LLM service unavailable" or API key errors

**Solutions**:
1. Verify `LLM_API_KEY` is set correctly in `.env`
2. Check API key is valid (test with curl):
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $LLM_API_KEY"
   ```
3. For Ollama, ensure it's running: `ollama list`
4. Check backend logs: `docker-compose logs backend | grep -i llm`

### Frontend SSL Certificate Warnings

**Problem**: Browser shows "Your connection is not private"

**Solutions**:
1. This is expected with self-signed certificates
2. Click "Advanced" → "Proceed to localhost"
3. For production, use CA-signed certificates (see DEPLOYMENT.md)
4. Regenerate certificates: `docker-compose restart frontend`

### MinIO Connection Errors

**Problem**: File upload fails or MinIO unreachable

**Solutions**:
1. Check MinIO is running: `docker-compose ps minio`
2. Access MinIO console: http://localhost:9001
3. Verify buckets exist (should auto-create on first upload)
4. Check MinIO logs: `docker-compose logs minio`
5. Restart MinIO: `docker-compose restart minio`

### Qdrant Vector Database Issues

**Problem**: RAG context retrieval fails

**Solutions**:
1. Check Qdrant is running: `docker-compose ps qdrant`
2. Access Qdrant dashboard: http://localhost:6333/dashboard
3. Verify collections exist (created on first document upload)
4. Check Qdrant logs: `docker-compose logs qdrant`
5. Re-index documents by re-uploading files

### Out of Memory Errors

**Problem**: Containers crash with OOM errors

**Solutions**:
1. Increase Docker memory limit (Docker Desktop → Settings → Resources)
2. Recommended: 8GB RAM for Docker
3. Reduce concurrent requests
4. Check for memory leaks: `docker stats`

### Port Already in Use

**Problem**: "Port is already allocated" error

**Solutions**:
1. Find process using port: `lsof -i :<port>`
2. Stop conflicting service or change port in `docker-compose.yml`
3. Common conflicts:
   - Port 80/443: Apache, Nginx, other web servers
   - Port 5432: Local PostgreSQL
   - Port 6379: Local Redis

### Permission Denied Errors

**Problem**: Volume mount or file access errors

**Solutions**:
1. On Linux, check Docker permissions: `sudo usermod -aG docker $USER`
2. Logout and login again
3. Check volume permissions: `docker-compose down -v && docker-compose up -d`

### Slow Performance

**Problem**: Generation takes longer than 30 seconds

**Solutions**:
1. Check LLM API response time
2. Verify Redis caching is working: `docker-compose exec redis redis-cli ping`
3. Check system resources: `docker stats`
4. Reduce embedding dimensions in `.env`
5. Use faster embedding model

### Cannot Login

**Problem**: Login fails with correct credentials

**Solutions**:
1. Verify backend is running: `curl http://localhost:3000/health/ready`
2. Check JWT_SECRET is set in `.env`
3. Clear browser cookies and try again
4. Reset admin password:
   ```bash
   docker-compose exec postgres psql -U nlpuser -d nlpgen \
     -c "UPDATE users SET password_hash='<new-hash>' WHERE email='admin@example.com';"
   ```

### Fresh Start

If all else fails, completely reset the application:

```bash
# Stop all services
docker-compose down

# Remove all volumes (⚠️ deletes all data)
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Rebuild and start
docker-compose up -d --build

# Check logs
docker-compose logs -f
```

## Additional Documentation

- **API Documentation**: See [API.md](./API.md) for complete API reference
- **Deployment Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
- **Frontend Docker**: See [frontend/DOCKER_README.md](./frontend/DOCKER_README.md)
- **Backend Initialization**: See [backend/INITIALIZATION.md](./backend/INITIALIZATION.md)
- **Authentication**: See [backend/src/AUTH_README.md](./backend/src/AUTH_README.md)
- **Error Handling**: See [backend/src/ERROR_HANDLING_README.md](./backend/src/ERROR_HANDLING_README.md)
- **Requirements**: See [.kiro/specs/nlp-code-generator/requirements.md](./.kiro/specs/nlp-code-generator/requirements.md)
- **Design**: See [.kiro/specs/nlp-code-generator/design.md](./.kiro/specs/nlp-code-generator/design.md)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2024 Cluedo Tech

### What this means:
- ✅ Free to use for commercial and personal projects
- ✅ Modify and distribute as you wish
- ✅ No warranty or liability
- ℹ️ Must include the original license and copyright notice

## 🙏 Acknowledgments

- Built with [OpenAI GPT](https://openai.com/) for intelligent code generation
- Vector search powered by [Qdrant](https://qdrant.tech/)
- UI components from [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Heroicons](https://heroicons.com/)

## 📞 Support

For issues and questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review logs: `docker-compose logs -f`
- Open an issue on [GitHub Issues](https://github.com/cluedotech/nlp-code-generator/issues)
- Read the [Contributing Guide](CONTRIBUTING.md)

## ⭐ Show Your Support

If you find this project useful, please consider:
- Giving it a ⭐ on [GitHub](https://github.com/cluedotech/nlp-code-generator)
- Sharing it with others
- Contributing to the project
- Reporting bugs and suggesting features

---

**Made with ❤️ by [Cluedo Tech](https://github.com/cluedotech)**
