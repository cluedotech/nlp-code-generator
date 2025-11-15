# Frontend Docker Configuration

This document describes the frontend Docker setup, including the multi-stage build process and Nginx configuration.

## Dockerfile Overview

The frontend uses a **multi-stage Docker build** to optimize the final image size and security:

### Stage 1: Builder
- Base image: `node:20-alpine`
- Installs dependencies and builds the React application
- Runs TypeScript compilation and Vite build
- Output: Production-ready static files in `/app/dist`

### Stage 2: Production
- Base image: `nginx:alpine`
- Copies built static files from builder stage
- Installs OpenSSL for SSL certificate generation
- Generates self-signed SSL certificates for HTTPS
- Configures Nginx to serve the application

## Nginx Configuration

The Nginx configuration (`nginx.conf`) provides:

### HTTP to HTTPS Redirect
- All HTTP (port 80) traffic is redirected to HTTPS (port 443)
- Ensures secure communication in all environments

### HTTPS Configuration
- Self-signed SSL certificates for development
- TLS 1.2 and 1.3 support
- Strong cipher configuration
- Session caching for performance

### Static File Serving
- Serves React build files from `/usr/share/nginx/html`
- SPA routing support (all routes serve `index.html`)
- Asset caching with 1-year expiration for static files
- Gzip compression for text-based files

### API Proxy
- Proxies `/api/*` requests to backend service
- WebSocket support for real-time features
- Proper headers for proxied requests
- 60-second timeouts for long-running requests

### Security Headers
- `X-Frame-Options`: Prevents clickjacking
- `X-Content-Type-Options`: Prevents MIME sniffing
- `X-XSS-Protection`: Enables XSS filtering
- `Referrer-Policy`: Controls referrer information

### Health Check
- `/health` endpoint for container health monitoring
- Returns 200 OK with "healthy" response

## SSL Certificates

### Development (Docker)
SSL certificates are automatically generated when the Docker container starts:
- Certificate: `/etc/nginx/ssl/nginx-selfsigned.crt`
- Private key: `/etc/nginx/ssl/nginx-selfsigned.key`
- DH parameters: `/etc/nginx/ssl/dhparam.pem`
- Valid for 365 days

### Development (Local)
To generate certificates for local development without Docker:

```bash
cd frontend
chmod +x generate-ssl-certs.sh
./generate-ssl-certs.sh
```

This creates certificates in `./ssl/` directory.

### Production
For production deployments, replace self-signed certificates with certificates from a trusted Certificate Authority (CA) like Let's Encrypt:

1. Obtain certificates from your CA
2. Mount certificates into the container:
   ```yaml
   volumes:
     - /path/to/cert.crt:/etc/nginx/ssl/nginx-selfsigned.crt:ro
     - /path/to/cert.key:/etc/nginx/ssl/nginx-selfsigned.key:ro
   ```
3. Or build a custom image with production certificates

## Building the Image

### Build locally:
```bash
cd frontend
docker build -t nlp-code-generator-frontend .
```

### Build with Docker Compose:
```bash
docker-compose build frontend
```

## Running the Container

### Standalone:
```bash
docker run -p 80:80 -p 443:443 nlp-code-generator-frontend
```

### With Docker Compose:
```bash
docker-compose up frontend
```

## Accessing the Application

- **HTTP**: http://localhost (redirects to HTTPS)
- **HTTPS**: https://localhost

**Note**: Your browser will show a security warning for self-signed certificates. This is expected in development. Click "Advanced" and "Proceed to localhost" to continue.

## Environment Variables

The frontend build can be configured with environment variables:

- `VITE_API_URL`: Backend API URL (default: `/api`)
- `VITE_APP_TITLE`: Application title

Set these in `.env` file or pass during build:
```bash
docker build --build-arg VITE_API_URL=https://api.example.com -t frontend .
```

## Performance Optimizations

1. **Multi-stage build**: Reduces final image size by excluding build tools
2. **Gzip compression**: Reduces bandwidth usage for text files
3. **Asset caching**: Browser caches static assets for 1 year
4. **HTTP/2**: Enabled for improved performance
5. **Session caching**: SSL session reuse reduces handshake overhead

## Troubleshooting

### Certificate Warnings
If you see SSL certificate warnings:
- This is normal for self-signed certificates
- Add exception in your browser for development
- Use proper CA-signed certificates in production

### API Proxy Not Working
If API requests fail:
- Check backend service is running: `docker-compose ps backend`
- Verify backend service name in `nginx.conf` matches docker-compose service name
- Check backend logs: `docker-compose logs backend`

### Build Failures
If Docker build fails:
- Ensure `package.json` and `package-lock.json` are present
- Check Node.js version compatibility
- Verify all source files are included (check `.dockerignore`)

### Container Won't Start
If container fails to start:
- Check logs: `docker logs <container-id>`
- Verify ports 80 and 443 are not in use
- Ensure nginx.conf syntax is valid: `nginx -t`

## Security Considerations

### Development
- Self-signed certificates are acceptable
- HTTP to HTTPS redirect can be disabled if needed
- CORS should be configured on backend

### Production
- Use CA-signed certificates (Let's Encrypt recommended)
- Enable HSTS (HTTP Strict Transport Security)
- Configure CSP (Content Security Policy) headers
- Regular security updates for base images
- Scan images for vulnerabilities

## File Structure

```
frontend/
├── Dockerfile                 # Multi-stage build configuration
├── nginx.conf                 # Nginx server configuration
├── generate-ssl-certs.sh      # Local SSL certificate generator
├── DOCKER_README.md           # This file
├── package.json               # Node.js dependencies
├── vite.config.ts            # Vite build configuration
└── src/                       # React source code
```
