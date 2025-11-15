# Frontend Deployment Guide

## Quick Reference

### Build and Run with Docker Compose
```bash
# Build and start all services
docker-compose up -d

# Rebuild frontend only
docker-compose build frontend
docker-compose up -d frontend

# View logs
docker-compose logs -f frontend
```

### Access the Application
- **HTTPS (recommended)**: https://localhost
- **HTTP**: http://localhost (redirects to HTTPS)

### SSL Certificate Warning
When accessing https://localhost for the first time, you'll see a browser security warning because the certificate is self-signed. This is normal for development.

**To proceed:**
1. Click "Advanced" or "Show Details"
2. Click "Proceed to localhost" or "Accept the Risk and Continue"
3. The warning won't appear again for this session

## Build Standalone Docker Image

```bash
# Build the image
docker build -t nlp-frontend:latest frontend/

# Run the container
docker run -d \
  --name nlp-frontend \
  -p 80:80 \
  -p 443:443 \
  nlp-frontend:latest

# View logs
docker logs -f nlp-frontend
```

## Local Development (without Docker)

### Generate SSL Certificates
```bash
cd frontend
./generate-ssl-certs.sh
```

This creates certificates in `frontend/ssl/` directory.

### Run Development Server
```bash
cd frontend
npm install
npm run dev
```

Access at: http://localhost:5173

## Production Deployment

### 1. Use Production SSL Certificates

Replace self-signed certificates with CA-signed certificates (e.g., Let's Encrypt):

**Option A: Mount certificates as volumes**
```yaml
# docker-compose.yml
services:
  frontend:
    volumes:
      - /path/to/fullchain.pem:/etc/nginx/ssl/nginx-selfsigned.crt:ro
      - /path/to/privkey.pem:/etc/nginx/ssl/nginx-selfsigned.key:ro
```

**Option B: Build custom image**
```dockerfile
# Dockerfile.prod
FROM nlp-frontend:latest
COPY fullchain.pem /etc/nginx/ssl/nginx-selfsigned.crt
COPY privkey.pem /etc/nginx/ssl/nginx-selfsigned.key
```

### 2. Update Nginx Configuration

For production, consider:
- Setting proper `server_name` (not localhost)
- Enabling HSTS header
- Configuring CSP headers
- Adjusting cache policies
- Setting up rate limiting

### 3. Environment Variables

Set production environment variables:
```bash
# .env
NODE_ENV=production
VITE_API_URL=https://api.yourdomain.com
```

### 4. Build Production Image
```bash
docker build \
  --build-arg NODE_ENV=production \
  -t nlp-frontend:production \
  frontend/
```

## Troubleshooting

### Certificate Errors
**Problem**: Browser shows "Your connection is not private"
**Solution**: This is expected with self-signed certificates. Click "Advanced" and proceed.

### API Requests Failing
**Problem**: Frontend can't reach backend API
**Solution**: 
- Ensure backend service is running: `docker-compose ps backend`
- Check backend logs: `docker-compose logs backend`
- Verify nginx proxy configuration in `nginx.conf`

### Port Already in Use
**Problem**: Cannot bind to port 80 or 443
**Solution**:
```bash
# Find process using the port
lsof -i :80
lsof -i :443

# Stop the process or use different ports
docker-compose down
```

### Build Fails
**Problem**: Docker build fails during npm install
**Solution**:
- Clear Docker cache: `docker builder prune`
- Check `package.json` and `package-lock.json` exist
- Verify Node.js version compatibility

### Container Exits Immediately
**Problem**: Container starts then stops
**Solution**:
```bash
# Check logs for errors
docker logs nlp-frontend

# Test nginx configuration
docker run --rm -v $(pwd)/frontend/nginx.conf:/etc/nginx/conf.d/default.conf nginx:alpine nginx -t
```

## Performance Optimization

### Image Size
Current multi-stage build produces a small image (~50MB):
- Builder stage: ~200MB (discarded)
- Final stage: ~50MB (nginx + static files)

### Caching Strategy
- Static assets: 1 year cache
- HTML files: No cache (always fresh)
- API responses: Handled by backend

### Compression
- Gzip enabled for text-based files
- Reduces bandwidth by ~70%

## Security Checklist

- [x] HTTPS enabled with SSL/TLS
- [x] HTTP to HTTPS redirect
- [x] Security headers configured
- [x] Gzip compression enabled
- [x] Static asset caching
- [x] API proxy with proper headers
- [ ] Production SSL certificates (for production)
- [ ] HSTS header (for production)
- [ ] CSP header (for production)
- [ ] Rate limiting (for production)

## Monitoring

### Health Check
```bash
# Check container health
docker ps

# Test health endpoint
curl http://localhost/health
# or
curl -k https://localhost/health
```

### Logs
```bash
# View real-time logs
docker-compose logs -f frontend

# View last 100 lines
docker-compose logs --tail=100 frontend
```

### Metrics
Access Nginx status (if enabled):
```bash
curl http://localhost/nginx_status
```

## Backup and Recovery

### Backup Configuration
```bash
# Backup nginx configuration
cp frontend/nginx.conf frontend/nginx.conf.backup

# Backup SSL certificates (if custom)
tar -czf ssl-backup.tar.gz /path/to/ssl/certs/
```

### Restore
```bash
# Restore configuration
cp frontend/nginx.conf.backup frontend/nginx.conf

# Rebuild container
docker-compose build frontend
docker-compose up -d frontend
```

## Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
