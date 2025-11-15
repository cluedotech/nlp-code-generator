# Deployment Guide

## Table of Contents

- [Overview](#overview)
- [Deployment Options](#deployment-options)
- [Prerequisites](#prerequisites)
- [Single-Server Deployment](#single-server-deployment)
- [Docker Swarm Deployment](#docker-swarm-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Production Configuration](#production-configuration)
- [Backup and Restore](#backup-and-restore)
- [Monitoring and Logging](#monitoring-and-logging)
- [Security Hardening](#security-hardening)
- [Scaling Strategies](#scaling-strategies)
- [Troubleshooting](#troubleshooting)

## Overview

This guide covers deploying the NLP Code Generator in production environments. The application is containerized and can be deployed using Docker Compose (single server), Docker Swarm (multi-node), or Kubernetes (enterprise scale).

### Architecture Summary

- **Frontend**: Nginx serving React SPA with HTTPS
- **Backend**: Node.js/Express API (horizontally scalable)
- **PostgreSQL**: Primary database (supports replication)
- **Redis**: Cache layer (supports clustering)
- **MinIO**: S3-compatible object storage (supports distributed mode)
- **Qdrant**: Vector database (supports clustering)

## Deployment Options

| Option | Use Case | Concurrent Users | Complexity |
|--------|----------|------------------|------------|
| **Single Server** | Development, small teams | Up to 50 | Low |
| **Docker Swarm** | Medium-scale production | 50-500 | Medium |
| **Kubernetes** | Enterprise, high availability | 500+ | High |

## Prerequisites

### Hardware Requirements

#### Single Server
- **CPU**: 4+ cores
- **RAM**: 16GB minimum, 32GB recommended
- **Disk**: 100GB SSD minimum
- **Network**: 100 Mbps minimum

#### Docker Swarm (3-node cluster)
- **Manager Node**: 4 cores, 16GB RAM, 100GB SSD
- **Worker Nodes**: 4 cores, 16GB RAM, 200GB SSD each

#### Kubernetes (5-node cluster)
- **Control Plane**: 2 cores, 4GB RAM, 50GB SSD
- **Worker Nodes**: 4 cores, 16GB RAM, 200GB SSD each

### Software Requirements

- **Operating System**: Ubuntu 20.04+ LTS, CentOS 8+, or RHEL 8+
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+ (for single server)
- **Docker Swarm**: Built into Docker (for multi-node)
- **Kubernetes**: Version 1.24+ (for K8s deployment)

### Network Requirements

- **Ports to Open**:
  - 80 (HTTP)
  - 443 (HTTPS)
  - 3000 (Backend API - internal)
  - 5432 (PostgreSQL - internal)
  - 6379 (Redis - internal)
  - 9000, 9001 (MinIO - internal)
  - 6333 (Qdrant - internal)

### SSL Certificates

For production, obtain SSL certificates from:
- Let's Encrypt (free, automated)
- Commercial CA (Digicert, GlobalSign, etc.)
- Internal CA (for private networks)


## Single-Server Deployment

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker-compose --version
```

### Step 2: Clone and Configure

```bash
# Clone repository
git clone <repository-url>
cd nlp-code-generator

# Create production environment file
cp .env.example .env.production

# Edit production configuration
nano .env.production
```

### Step 3: Production Environment Variables

Edit `.env.production` with production values:

```bash
# Database Configuration
POSTGRES_DB=nlpgen_prod
POSTGRES_USER=nlpgen_user
POSTGRES_PASSWORD=<strong-random-password>

# MinIO Configuration
MINIO_ROOT_USER=<strong-random-username>
MINIO_ROOT_PASSWORD=<strong-random-password>

# Backend Configuration
JWT_SECRET=<strong-random-secret-64-chars>
DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
DEFAULT_ADMIN_PASSWORD=<strong-admin-password>

# LLM Configuration
LLM_API_KEY=<your-production-api-key>
LLM_API_URL=https://api.openai.com/v1

# Qdrant Configuration
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=<optional-qdrant-api-key>

# Redis Configuration
REDIS_URL=redis://redis:6379
```

### Step 4: SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be at:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Copy certificates to project
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem frontend/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem frontend/ssl/key.pem
sudo chown $USER:$USER frontend/ssl/*.pem
```

#### Option B: Self-Signed (Development/Internal)

```bash
cd frontend
./generate-ssl-certs.sh
```

### Step 5: Update Docker Compose for Production

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: nlp-postgres-prod
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: nlp-redis-prod
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: nlp-minio-prod
    restart: always
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio-data:/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  qdrant:
    image: qdrant/qdrant:latest
    container_name: nlp-qdrant-prod
    restart: always
    volumes:
      - qdrant-data:/qdrant/storage
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: nlp-backend-prod
    restart: always
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://redis:6379
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      QDRANT_URL: http://qdrant:6333
      JWT_SECRET: ${JWT_SECRET}
      LLM_API_KEY: ${LLM_API_KEY}
      LLM_API_URL: ${LLM_API_URL}
      DEFAULT_ADMIN_EMAIL: ${DEFAULT_ADMIN_EMAIL}
      DEFAULT_ADMIN_PASSWORD: ${DEFAULT_ADMIN_PASSWORD}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
      qdrant:
        condition: service_healthy
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health/ready"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: nlp-frontend-prod
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./frontend/ssl:/etc/nginx/ssl:ro
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80/"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

volumes:
  postgres-data:
    driver: local
  redis-data:
    driver: local
  minio-data:
    driver: local
  qdrant-data:
    driver: local

networks:
  app-network:
    driver: bridge
```

### Step 6: Deploy

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Verify all services are healthy
docker-compose -f docker-compose.prod.yml ps
```

### Step 7: Post-Deployment

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test frontend
curl -k https://localhost

# Change default admin password immediately
# Login at https://yourdomain.com and change password
```

### Step 8: Setup Automatic Backups

```bash
# Create backup script
cat > /usr/local/bin/nlp-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/nlp-code-generator"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec nlp-postgres-prod pg_dump -U nlpgen_user nlpgen_prod | gzip > $BACKUP_DIR/postgres_$DATE.sql.gz

# Backup MinIO data
docker exec nlp-minio-prod tar czf - /data | cat > $BACKUP_DIR/minio_$DATE.tar.gz

# Backup Qdrant data
docker exec nlp-qdrant-prod tar czf - /qdrant/storage | cat > $BACKUP_DIR/qdrant_$DATE.tar.gz

# Keep only last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /usr/local/bin/nlp-backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/nlp-backup.sh") | crontab -
```


## Docker Swarm Deployment

Docker Swarm provides orchestration for multi-node deployments with built-in load balancing and service discovery.

### Step 1: Initialize Swarm

On the manager node:

```bash
# Initialize swarm
docker swarm init --advertise-addr <MANAGER-IP>

# Save the join token
docker swarm join-token worker
```

On worker nodes:

```bash
# Join the swarm (use token from manager)
docker swarm join --token <TOKEN> <MANAGER-IP>:2377
```

### Step 2: Create Overlay Network

```bash
# Create overlay network for services
docker network create --driver overlay --attachable nlp-network
```

### Step 3: Create Docker Stack File

Create `docker-stack.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: nlpgen_prod
      POSTGRES_USER: nlpgen_user
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    secrets:
      - postgres_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - nlp-network
    deploy:
      placement:
        constraints:
          - node.role == manager
      replicas: 1
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - nlp-network
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      restart_policy:
        condition: on-failure

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER_FILE: /run/secrets/minio_user
      MINIO_ROOT_PASSWORD_FILE: /run/secrets/minio_password
    secrets:
      - minio_user
      - minio_password
    volumes:
      - minio-data:/data
    networks:
      - nlp-network
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager

  qdrant:
    image: qdrant/qdrant:latest
    volumes:
      - qdrant-data:/qdrant/storage
    networks:
      - nlp-network
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager

  backend:
    image: your-registry/nlp-backend:latest
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://nlpgen_user:password@postgres:5432/nlpgen_prod
      REDIS_URL: redis://redis:6379
      MINIO_ENDPOINT: minio
      QDRANT_URL: http://qdrant:6333
      JWT_SECRET_FILE: /run/secrets/jwt_secret
      LLM_API_KEY_FILE: /run/secrets/llm_api_key
    secrets:
      - jwt_secret
      - llm_api_key
    networks:
      - nlp-network
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

  frontend:
    image: your-registry/nlp-frontend:latest
    ports:
      - "80:80"
      - "443:443"
    networks:
      - nlp-network
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: '1'
          memory: 1G

volumes:
  postgres-data:
    driver: local
  redis-data:
    driver: local
  minio-data:
    driver: local
  qdrant-data:
    driver: local

networks:
  nlp-network:
    driver: overlay
    attachable: true

secrets:
  postgres_password:
    external: true
  minio_user:
    external: true
  minio_password:
    external: true
  jwt_secret:
    external: true
  llm_api_key:
    external: true
```

### Step 4: Create Secrets

```bash
# Create secrets
echo "strong-postgres-password" | docker secret create postgres_password -
echo "minio-admin" | docker secret create minio_user -
echo "strong-minio-password" | docker secret create minio_password -
echo "your-64-char-jwt-secret" | docker secret create jwt_secret -
echo "your-llm-api-key" | docker secret create llm_api_key -
```

### Step 5: Deploy Stack

```bash
# Deploy the stack
docker stack deploy -c docker-stack.yml nlp-app

# Check services
docker stack services nlp-app

# Check service logs
docker service logs nlp-app_backend

# Scale backend service
docker service scale nlp-app_backend=5
```

### Step 6: Update Services

```bash
# Update backend image
docker service update --image your-registry/nlp-backend:v2 nlp-app_backend

# Rollback if needed
docker service rollback nlp-app_backend
```


## Kubernetes Deployment

For enterprise-scale deployments with advanced orchestration features.

### Step 1: Create Namespace

```bash
kubectl create namespace nlp-code-generator
kubectl config set-context --current --namespace=nlp-code-generator
```

### Step 2: Create Secrets

```bash
# Create secrets
kubectl create secret generic postgres-credentials \
  --from-literal=username=nlpgen_user \
  --from-literal=password=strong-password

kubectl create secret generic minio-credentials \
  --from-literal=username=minio-admin \
  --from-literal=password=strong-password

kubectl create secret generic jwt-secret \
  --from-literal=secret=your-64-char-jwt-secret

kubectl create secret generic llm-api-key \
  --from-literal=key=your-llm-api-key
```

### Step 3: Create Persistent Volumes

Create `persistent-volumes.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: standard
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: minio-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: standard
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: qdrant-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: standard
```

Apply:
```bash
kubectl apply -f persistent-volumes.yaml
```

### Step 4: Deploy Services

Create `deployments.yaml`:

```yaml
# PostgreSQL Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: nlpgen_prod
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
---
# Backend Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: your-registry/nlp-backend:latest
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          value: postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@postgres:5432/nlpgen_prod
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        - name: LLM_API_KEY
          valueFrom:
            secretKeyRef:
              name: llm-api-key
              key: key
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /api/health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
---
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  selector:
    app: backend
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
---
# Frontend Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/nlp-frontend:latest
        ports:
        - containerPort: 80
        - containerPort: 443
        resources:
          requests:
            memory: "512Mi"
            cpu: "0.5"
          limits:
            memory: "1Gi"
            cpu: "1"
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  selector:
    app: frontend
  ports:
  - name: http
    port: 80
    targetPort: 80
  - name: https
    port: 443
    targetPort: 443
  type: LoadBalancer
```

Apply:
```bash
kubectl apply -f deployments.yaml
```

### Step 5: Configure Ingress (Optional)

Create `ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nlp-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - yourdomain.com
    secretName: nlp-tls-cert
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

Apply:
```bash
kubectl apply -f ingress.yaml
```

### Step 6: Setup Horizontal Pod Autoscaling

```bash
# Autoscale backend based on CPU
kubectl autoscale deployment backend --cpu-percent=70 --min=3 --max=10

# Autoscale frontend based on CPU
kubectl autoscale deployment frontend --cpu-percent=70 --min=2 --max=5
```

### Step 7: Monitor Deployment

```bash
# Check pods
kubectl get pods

# Check services
kubectl get services

# Check logs
kubectl logs -f deployment/backend

# Describe pod for troubleshooting
kubectl describe pod <pod-name>
```


## Production Configuration

### Environment Variables Best Practices

1. **Never commit secrets to version control**
2. **Use strong, randomly generated passwords**
3. **Rotate secrets regularly**
4. **Use secret management tools** (Vault, AWS Secrets Manager, etc.)

### Generate Strong Secrets

```bash
# Generate JWT secret (64 characters)
openssl rand -hex 32

# Generate database password
openssl rand -base64 32

# Generate MinIO credentials
openssl rand -base64 24
```

### Nginx Configuration for Production

Update `frontend/nginx.conf` for production:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # Frontend
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://backend:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # File Upload Size
    client_max_body_size 50M;
}
```

### Database Optimization

PostgreSQL configuration for production (`postgresql.conf`):

```ini
# Memory Settings
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
work_mem = 64MB

# Checkpoint Settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
max_wal_size = 4GB
min_wal_size = 1GB

# Query Planning
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on

# Connection Settings
max_connections = 200
```

### Redis Configuration

Redis configuration for production:

```bash
# Enable persistence
appendonly yes
appendfsync everysec

# Memory management
maxmemory 2gb
maxmemory-policy allkeys-lru

# Security
requirepass your-strong-redis-password

# Performance
tcp-backlog 511
timeout 300
```


## Backup and Restore

### Automated Backup Strategy

#### PostgreSQL Backup

```bash
#!/bin/bash
# /usr/local/bin/backup-postgres.sh

BACKUP_DIR="/var/backups/nlp/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

# Full backup
docker exec nlp-postgres-prod pg_dump -U nlpgen_user -Fc nlpgen_prod > $BACKUP_DIR/full_$DATE.dump

# Compressed SQL backup
docker exec nlp-postgres-prod pg_dump -U nlpgen_user nlpgen_prod | gzip > $BACKUP_DIR/full_$DATE.sql.gz

# Remove old backups
find $BACKUP_DIR -name "*.dump" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "PostgreSQL backup completed: $DATE"
```

#### MinIO Backup

```bash
#!/bin/bash
# /usr/local/bin/backup-minio.sh

BACKUP_DIR="/var/backups/nlp/minio"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

# Backup MinIO data
docker exec nlp-minio-prod tar czf - /data > $BACKUP_DIR/minio_$DATE.tar.gz

# Remove old backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "MinIO backup completed: $DATE"
```

#### Qdrant Backup

```bash
#!/bin/bash
# /usr/local/bin/backup-qdrant.sh

BACKUP_DIR="/var/backups/nlp/qdrant"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

# Create Qdrant snapshot
docker exec nlp-qdrant-prod curl -X POST http://localhost:6333/collections/documents/snapshots

# Backup Qdrant storage
docker exec nlp-qdrant-prod tar czf - /qdrant/storage > $BACKUP_DIR/qdrant_$DATE.tar.gz

# Remove old backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Qdrant backup completed: $DATE"
```

#### Master Backup Script

```bash
#!/bin/bash
# /usr/local/bin/backup-all.sh

echo "Starting full backup..."

/usr/local/bin/backup-postgres.sh
/usr/local/bin/backup-minio.sh
/usr/local/bin/backup-qdrant.sh

# Upload to S3 (optional)
if [ -n "$AWS_S3_BUCKET" ]; then
    aws s3 sync /var/backups/nlp/ s3://$AWS_S3_BUCKET/nlp-backups/
fi

echo "Full backup completed"
```

#### Schedule Backups

```bash
# Make scripts executable
chmod +x /usr/local/bin/backup-*.sh

# Add to crontab
crontab -e

# Add these lines:
# Daily full backup at 2 AM
0 2 * * * /usr/local/bin/backup-all.sh >> /var/log/nlp-backup.log 2>&1

# Hourly PostgreSQL backup (incremental)
0 * * * * /usr/local/bin/backup-postgres.sh >> /var/log/nlp-backup.log 2>&1
```

### Restore Procedures

#### Restore PostgreSQL

```bash
# Stop backend to prevent connections
docker-compose stop backend

# Restore from custom format dump
docker exec -i nlp-postgres-prod pg_restore -U nlpgen_user -d nlpgen_prod -c < /path/to/backup.dump

# OR restore from SQL dump
gunzip -c /path/to/backup.sql.gz | docker exec -i nlp-postgres-prod psql -U nlpgen_user -d nlpgen_prod

# Start backend
docker-compose start backend
```

#### Restore MinIO

```bash
# Stop services
docker-compose stop backend frontend

# Restore MinIO data
docker exec -i nlp-minio-prod tar xzf - -C / < /path/to/minio_backup.tar.gz

# Restart services
docker-compose start minio backend frontend
```

#### Restore Qdrant

```bash
# Stop backend
docker-compose stop backend

# Restore Qdrant storage
docker exec -i nlp-qdrant-prod tar xzf - -C / < /path/to/qdrant_backup.tar.gz

# Restart services
docker-compose start qdrant backend
```

### Disaster Recovery

#### Complete System Restore

```bash
#!/bin/bash
# disaster-recovery.sh

# 1. Stop all services
docker-compose down

# 2. Restore volumes
docker volume rm nlp_postgres-data nlp_minio-data nlp_qdrant-data nlp_redis-data
docker volume create nlp_postgres-data
docker volume create nlp_minio-data
docker volume create nlp_qdrant-data
docker volume create nlp_redis-data

# 3. Start only data services
docker-compose up -d postgres redis minio qdrant

# 4. Wait for services to be ready
sleep 30

# 5. Restore data
./restore-postgres.sh /path/to/postgres_backup.dump
./restore-minio.sh /path/to/minio_backup.tar.gz
./restore-qdrant.sh /path/to/qdrant_backup.tar.gz

# 6. Start application services
docker-compose up -d backend frontend

# 7. Verify
curl http://localhost:3000/api/health
```


## Monitoring and Logging

### Prometheus + Grafana Stack

#### Deploy Monitoring Stack

Create `monitoring-stack.yml`:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    ports:
      - "9090:9090"
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
    ports:
      - "3001:3000"
    networks:
      - monitoring

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    networks:
      - monitoring

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: cadvisor
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    ports:
      - "8080:8080"
    networks:
      - monitoring

volumes:
  prometheus-data:
  grafana-data:

networks:
  monitoring:
    driver: bridge
```

#### Prometheus Configuration

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/api/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

#### Start Monitoring

```bash
docker-compose -f monitoring-stack.yml up -d

# Access Grafana
# URL: http://localhost:3001
# Username: admin
# Password: admin
```

### Centralized Logging with ELK Stack

#### Deploy ELK Stack

```yaml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.10.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
      - xpack.security.enabled=false
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    networks:
      - logging

  logstash:
    image: docker.elastic.co/logstash/logstash:8.10.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5000:5000"
    networks:
      - logging
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.10.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    networks:
      - logging
    depends_on:
      - elasticsearch

volumes:
  elasticsearch-data:

networks:
  logging:
    driver: bridge
```

### Application Logging

#### Configure Backend Logging

Update backend to use structured logging:

```typescript
// backend/src/utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'nlp-backend' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

export default logger;
```

### Health Check Monitoring

#### Setup Uptime Monitoring

```bash
# Install Uptime Kuma
docker run -d --restart=always \
  -p 3002:3001 \
  -v uptime-kuma:/app/data \
  --name uptime-kuma \
  louislam/uptime-kuma:1
```

Access at `http://localhost:3002` and configure monitors for:
- Frontend (https://yourdomain.com)
- Backend API (http://localhost:3000/api/health)
- PostgreSQL
- Redis
- MinIO
- Qdrant

### Alert Configuration

#### Prometheus Alerting Rules

Create `alert-rules.yml`:

```yaml
groups:
  - name: nlp_alerts
    interval: 30s
    rules:
      - alert: HighCPUUsage
        expr: rate(process_cpu_seconds_total[5m]) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 80% for 5 minutes"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 90%"

      - alert: ServiceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.job }} has been down for 2 minutes"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5%"
```


## Security Hardening

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# For Docker Swarm (additional ports)
sudo ufw allow 2377/tcp  # Swarm management
sudo ufw allow 7946/tcp  # Container network discovery
sudo ufw allow 7946/udp
sudo ufw allow 4789/udp  # Overlay network traffic
```

### Docker Security

#### Run Containers as Non-Root

Update Dockerfiles:

```dockerfile
# Backend Dockerfile
FROM node:18-alpine

# Create app user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app
COPY --chown=nodejs:nodejs . .

USER nodejs

CMD ["node", "dist/index.js"]
```

#### Enable Docker Content Trust

```bash
# Enable content trust
export DOCKER_CONTENT_TRUST=1

# Sign images before pushing
docker trust sign your-registry/nlp-backend:latest
```

#### Scan Images for Vulnerabilities

```bash
# Using Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image your-registry/nlp-backend:latest

# Using Docker Scout
docker scout cves your-registry/nlp-backend:latest
```

### Network Security

#### Isolate Networks

```yaml
# docker-compose.prod.yml
networks:
  frontend-network:
    driver: bridge
    internal: false
  backend-network:
    driver: bridge
    internal: true
  database-network:
    driver: bridge
    internal: true

services:
  frontend:
    networks:
      - frontend-network
      - backend-network
  
  backend:
    networks:
      - backend-network
      - database-network
  
  postgres:
    networks:
      - database-network
```

### SSL/TLS Configuration

#### Strong SSL Configuration

```nginx
# Nginx SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
ssl_prefer_server_ciphers off;

# HSTS
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/nginx/ssl/chain.pem;
```

### Database Security

#### PostgreSQL Hardening

```sql
-- Create read-only user for reporting
CREATE USER readonly_user WITH PASSWORD 'strong-password';
GRANT CONNECT ON DATABASE nlpgen_prod TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- Revoke unnecessary privileges
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Enable SSL connections
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = '/var/lib/postgresql/server.crt';
ALTER SYSTEM SET ssl_key_file = '/var/lib/postgresql/server.key';
```

#### Encrypt Database Connections

Update connection string:
```
postgresql://user:pass@host:5432/db?sslmode=require
```

### API Security

#### Rate Limiting

Install and configure rate limiting:

```typescript
// backend/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const generationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit generation requests
  message: 'Generation limit exceeded, please try again later.',
});
```

Apply to routes:
```typescript
app.use('/api/', apiLimiter);
app.use('/api/generate', generationLimiter);
```

#### Input Validation

```typescript
// Use express-validator
import { body, validationResult } from 'express-validator';

router.post('/generate',
  body('request').isString().trim().isLength({ min: 1, max: 5000 }),
  body('outputType').isIn(['sql', 'n8n', 'formio']),
  body('versionId').isUUID(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process request
  }
);
```

### Secrets Management

#### Using HashiCorp Vault

```bash
# Install Vault
docker run -d --name=vault --cap-add=IPC_LOCK \
  -e 'VAULT_DEV_ROOT_TOKEN_ID=myroot' \
  -p 8200:8200 vault

# Store secrets
vault kv put secret/nlp-app \
  postgres_password=strong-password \
  jwt_secret=your-secret \
  llm_api_key=your-key

# Retrieve in application
export VAULT_ADDR='http://localhost:8200'
export VAULT_TOKEN='myroot'
vault kv get -field=postgres_password secret/nlp-app
```

### Security Checklist

- [ ] Change all default passwords
- [ ] Enable firewall with minimal open ports
- [ ] Use SSL/TLS for all connections
- [ ] Implement rate limiting
- [ ] Enable Docker content trust
- [ ] Scan images for vulnerabilities
- [ ] Use secrets management (Vault, AWS Secrets Manager)
- [ ] Enable audit logging
- [ ] Implement network segmentation
- [ ] Regular security updates
- [ ] Backup encryption
- [ ] Access control and RBAC
- [ ] Monitor for suspicious activity
- [ ] Implement intrusion detection
- [ ] Regular security audits


## Scaling Strategies

### Horizontal Scaling

#### Backend Scaling

```bash
# Docker Compose
docker-compose up -d --scale backend=5

# Docker Swarm
docker service scale nlp-app_backend=10

# Kubernetes
kubectl scale deployment backend --replicas=10
```

#### Load Balancing

##### Nginx Load Balancer

```nginx
upstream backend_servers {
    least_conn;
    server backend-1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server backend-2:3000 weight=1 max_fails=3 fail_timeout=30s;
    server backend-3:3000 weight=1 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    
    location /api/ {
        proxy_pass http://backend_servers;
        proxy_next_upstream error timeout http_502 http_503 http_504;
    }
}
```

##### HAProxy Configuration

```haproxy
frontend http_front
    bind *:80
    default_backend backend_servers

backend backend_servers
    balance roundrobin
    option httpchk GET /api/health/ready
    server backend1 backend-1:3000 check
    server backend2 backend-2:3000 check
    server backend3 backend-3:3000 check
```

### Vertical Scaling

#### Increase Container Resources

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
        reservations:
          cpus: '2'
          memory: 4G
```

### Database Scaling

#### PostgreSQL Read Replicas

```yaml
# Primary database
postgres-primary:
  image: postgres:15-alpine
  environment:
    POSTGRES_REPLICATION_MODE: master
    POSTGRES_REPLICATION_USER: replicator
    POSTGRES_REPLICATION_PASSWORD: repl_password

# Read replica
postgres-replica:
  image: postgres:15-alpine
  environment:
    POSTGRES_REPLICATION_MODE: slave
    POSTGRES_MASTER_HOST: postgres-primary
    POSTGRES_MASTER_PORT: 5432
    POSTGRES_REPLICATION_USER: replicator
    POSTGRES_REPLICATION_PASSWORD: repl_password
```

#### Connection Pooling

Use PgBouncer for connection pooling:

```yaml
pgbouncer:
  image: pgbouncer/pgbouncer:latest
  environment:
    DATABASES_HOST: postgres
    DATABASES_PORT: 5432
    DATABASES_USER: nlpgen_user
    DATABASES_PASSWORD: password
    DATABASES_DBNAME: nlpgen_prod
    PGBOUNCER_POOL_MODE: transaction
    PGBOUNCER_MAX_CLIENT_CONN: 1000
    PGBOUNCER_DEFAULT_POOL_SIZE: 25
```

### Redis Scaling

#### Redis Cluster

```yaml
redis-cluster:
  image: redis:7-alpine
  command: redis-cli --cluster create \
    redis-1:6379 redis-2:6379 redis-3:6379 \
    redis-4:6379 redis-5:6379 redis-6:6379 \
    --cluster-replicas 1
```

### MinIO Scaling

#### Distributed MinIO

```yaml
minio-1:
  image: minio/minio:latest
  command: server http://minio-{1...4}/data{1...2}
  environment:
    MINIO_ROOT_USER: admin
    MINIO_ROOT_PASSWORD: password

minio-2:
  image: minio/minio:latest
  command: server http://minio-{1...4}/data{1...2}

minio-3:
  image: minio/minio:latest
  command: server http://minio-{1...4}/data{1...2}

minio-4:
  image: minio/minio:latest
  command: server http://minio-{1...4}/data{1...2}
```

### Caching Strategy

#### Multi-Level Caching

```typescript
// 1. Application-level cache (in-memory)
const cache = new Map();

// 2. Redis cache (distributed)
const redisCache = new Redis();

// 3. CDN cache (static assets)
// Configure CloudFlare, AWS CloudFront, etc.

async function getCachedData(key: string) {
  // Check L1 cache
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  // Check L2 cache
  const redisData = await redisCache.get(key);
  if (redisData) {
    cache.set(key, redisData);
    return redisData;
  }
  
  // Fetch from database
  const dbData = await fetchFromDB(key);
  
  // Populate caches
  cache.set(key, dbData);
  await redisCache.set(key, dbData, 'EX', 3600);
  
  return dbData;
}
```

### Auto-Scaling

#### Kubernetes HPA (Horizontal Pod Autoscaler)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 4
        periodSeconds: 30
      selectPolicy: Max
```

### Performance Optimization

#### Database Query Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_request_history_user_created ON request_history(user_id, created_at DESC);
CREATE INDEX idx_files_version_type ON files(version_id, file_type);
CREATE INDEX idx_users_email ON users(email);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM request_history WHERE user_id = 'uuid' ORDER BY created_at DESC LIMIT 50;
```

#### Backend Optimization

```typescript
// Use compression
import compression from 'compression';
app.use(compression());

// Enable HTTP/2
// Configure in Nginx or use Node.js http2 module

// Optimize JSON parsing
app.use(express.json({ limit: '10mb' }));

// Connection pooling
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```


## Troubleshooting

### Common Deployment Issues

#### Issue: Services Won't Start

**Symptoms**: Containers exit immediately or fail health checks

**Solutions**:
```bash
# Check logs
docker-compose logs backend

# Check container status
docker-compose ps

# Inspect container
docker inspect nlp-backend-prod

# Check resource usage
docker stats

# Verify environment variables
docker-compose config
```

#### Issue: Database Connection Failures

**Symptoms**: Backend can't connect to PostgreSQL

**Solutions**:
```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection manually
docker exec -it nlp-postgres-prod psql -U nlpgen_user -d nlpgen_prod

# Verify network connectivity
docker exec nlp-backend-prod ping postgres

# Check connection string
docker exec nlp-backend-prod env | grep DATABASE_URL
```

#### Issue: Out of Memory

**Symptoms**: Containers crash with OOM errors

**Solutions**:
```bash
# Check memory usage
docker stats

# Increase Docker memory limit
# Docker Desktop: Settings → Resources → Memory

# Reduce container memory limits
# Edit docker-compose.yml and reduce memory limits

# Add swap space (Linux)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### Issue: Slow Performance

**Symptoms**: High response times, timeouts

**Solutions**:
```bash
# Check system resources
htop
iostat -x 1

# Check database performance
docker exec nlp-postgres-prod psql -U nlpgen_user -d nlpgen_prod \
  -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check slow queries
docker exec nlp-postgres-prod psql -U nlpgen_user -d nlpgen_prod \
  -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Clear Redis cache
docker exec nlp-redis-prod redis-cli FLUSHALL

# Restart services
docker-compose restart backend
```

#### Issue: SSL Certificate Errors

**Symptoms**: Browser shows certificate warnings

**Solutions**:
```bash
# Verify certificate files exist
ls -la frontend/ssl/

# Check certificate validity
openssl x509 -in frontend/ssl/cert.pem -text -noout

# Regenerate certificates
cd frontend && ./generate-ssl-certs.sh

# For Let's Encrypt, renew certificates
sudo certbot renew

# Restart frontend
docker-compose restart frontend
```

#### Issue: File Upload Failures

**Symptoms**: File uploads timeout or fail

**Solutions**:
```bash
# Check MinIO is running
docker-compose ps minio

# Check MinIO logs
docker-compose logs minio

# Verify MinIO buckets
docker exec nlp-minio-prod mc ls local/

# Test MinIO connectivity
curl http://localhost:9000/minio/health/live

# Increase upload size limits
# Edit nginx.conf: client_max_body_size 100M;
```

#### Issue: Vector Search Not Working

**Symptoms**: RAG context retrieval fails

**Solutions**:
```bash
# Check Qdrant is running
docker-compose ps qdrant

# Check Qdrant collections
curl http://localhost:6333/collections

# Verify embeddings exist
curl http://localhost:6333/collections/documents/points/count

# Re-index documents
# Delete and re-upload files through admin panel

# Check Qdrant logs
docker-compose logs qdrant
```

### Debugging Tools

#### Container Shell Access

```bash
# Access backend shell
docker exec -it nlp-backend-prod sh

# Access PostgreSQL shell
docker exec -it nlp-postgres-prod psql -U nlpgen_user -d nlpgen_prod

# Access Redis CLI
docker exec -it nlp-redis-prod redis-cli
```

#### Network Debugging

```bash
# Test connectivity between containers
docker exec nlp-backend-prod ping postgres
docker exec nlp-backend-prod nc -zv postgres 5432

# Check DNS resolution
docker exec nlp-backend-prod nslookup postgres

# Inspect network
docker network inspect nlp_app-network
```

#### Log Analysis

```bash
# Follow all logs
docker-compose logs -f

# Filter logs by service
docker-compose logs -f backend | grep ERROR

# Export logs
docker-compose logs --no-color > logs.txt

# Check log file sizes
docker exec nlp-backend-prod du -sh /var/log/*
```

### Performance Profiling

#### Backend Profiling

```bash
# Install clinic.js
npm install -g clinic

# Profile CPU
clinic doctor -- node dist/index.js

# Profile memory
clinic heapprofiler -- node dist/index.js

# Analyze flame graphs
clinic flame -- node dist/index.js
```

#### Database Profiling

```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 100;
SELECT pg_reload_conf();

-- View slow queries
SELECT query, calls, total_time, mean_time, max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Emergency Procedures

#### Quick Restart

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend

# Force recreate containers
docker-compose up -d --force-recreate
```

#### Rollback Deployment

```bash
# Docker Swarm
docker service rollback nlp-app_backend

# Kubernetes
kubectl rollout undo deployment/backend

# Docker Compose (manual)
git checkout previous-commit
docker-compose up -d --build
```

#### Emergency Maintenance Mode

```nginx
# Add to nginx.conf
location / {
    return 503;
}

error_page 503 @maintenance;
location @maintenance {
    root /usr/share/nginx/html;
    rewrite ^(.*)$ /maintenance.html break;
}
```

### Support Resources

- **Documentation**: Check README.md and API.md
- **Logs**: Review application and container logs
- **Health Checks**: Monitor /api/health endpoint
- **Metrics**: Check Prometheus/Grafana dashboards
- **Community**: GitHub issues, Stack Overflow
- **Professional Support**: Contact your DevOps team

---

## Conclusion

This deployment guide covers the essential aspects of deploying the NLP Code Generator in production environments. Always test deployments in a staging environment before production, maintain regular backups, and monitor system health continuously.

For additional help:
- Review the [README.md](./README.md) for setup instructions
- Check [API.md](./API.md) for API documentation
- Consult the [design document](./.kiro/specs/nlp-code-generator/design.md) for architecture details

**Remember**: Security, monitoring, and backups are not optional in production!
