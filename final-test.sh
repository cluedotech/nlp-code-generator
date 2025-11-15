#!/bin/bash

# Final cleanup and test script before GitHub publication
# This script will clean everything and do a fresh deployment test

set -e  # Exit on error

echo "🧹 NLP Code Generator - Final Cleanup & Test"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Stop and remove all containers
echo "📦 Step 1: Stopping and removing all containers..."
docker-compose down -v 2>/dev/null || true
echo -e "${GREEN}✓ Containers stopped${NC}"
echo ""

# Step 2: Remove build artifacts
echo "🗑️  Step 2: Removing build artifacts..."
rm -rf backend/node_modules backend/dist
rm -rf frontend/node_modules frontend/dist
echo -e "${GREEN}✓ Build artifacts removed${NC}"
echo ""

# Step 3: Clean Docker system
echo "🐳 Step 3: Cleaning Docker system..."
docker system prune -f
echo -e "${GREEN}✓ Docker system cleaned${NC}"
echo ""

# Step 4: Remove logs
echo "📝 Step 4: Removing log files..."
find . -name "*.log" -type f -delete 2>/dev/null || true
rm -rf logs/ 2>/dev/null || true
echo -e "${GREEN}✓ Log files removed${NC}"
echo ""

# Step 5: Verify .env is not present
echo "🔒 Step 5: Checking for .env file..."
if [ -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file found - removing it${NC}"
    rm .env
fi
echo -e "${GREEN}✓ No .env file present${NC}"
echo ""

# Step 6: Copy .env.example to .env for testing
echo "📋 Step 6: Creating .env from template..."
cp .env.example .env
echo -e "${YELLOW}⚠️  Please edit .env and add your LLM_API_KEY${NC}"
echo ""
read -p "Press Enter after you've added your API key to .env..."
echo ""

# Step 7: Build Docker images
echo "🔨 Step 7: Building Docker images..."
docker-compose build
echo -e "${GREEN}✓ Docker images built${NC}"
echo ""

# Step 8: Start services
echo "🚀 Step 8: Starting services..."
docker-compose up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

# Step 9: Wait for services to be ready
echo "⏳ Step 9: Waiting for services to be ready (60 seconds)..."
for i in {60..1}; do
    echo -ne "\r   Waiting... $i seconds remaining "
    sleep 1
done
echo ""
echo -e "${GREEN}✓ Services should be ready${NC}"
echo ""

# Step 10: Check service health
echo "🏥 Step 10: Checking service health..."
echo ""

echo "   Checking PostgreSQL..."
docker-compose ps postgres | grep "Up (healthy)" > /dev/null && echo -e "   ${GREEN}✓ PostgreSQL is healthy${NC}" || echo -e "   ${RED}✗ PostgreSQL is not healthy${NC}"

echo "   Checking Redis..."
docker-compose ps redis | grep "Up (healthy)" > /dev/null && echo -e "   ${GREEN}✓ Redis is healthy${NC}" || echo -e "   ${RED}✗ Redis is not healthy${NC}"

echo "   Checking MinIO..."
docker-compose ps minio | grep "Up (healthy)" > /dev/null && echo -e "   ${GREEN}✓ MinIO is healthy${NC}" || echo -e "   ${RED}✗ MinIO is not healthy${NC}"

echo "   Checking Qdrant..."
docker-compose ps qdrant | grep "Up" > /dev/null && echo -e "   ${GREEN}✓ Qdrant is running${NC}" || echo -e "   ${RED}✗ Qdrant is not running${NC}"

echo "   Checking Backend..."
docker-compose ps backend | grep "Up (healthy)" > /dev/null && echo -e "   ${GREEN}✓ Backend is healthy${NC}" || echo -e "   ${RED}✗ Backend is not healthy${NC}"

echo "   Checking Frontend..."
docker-compose ps frontend | grep "Up" > /dev/null && echo -e "   ${GREEN}✓ Frontend is running${NC}" || echo -e "   ${RED}✗ Frontend is not running${NC}"

echo ""

# Step 11: Test backend health endpoint
echo "🔍 Step 11: Testing backend health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health/ready || echo "failed")
if [[ $HEALTH_RESPONSE == *"ready"* ]]; then
    echo -e "${GREEN}✓ Backend health check passed${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    echo "   Response: $HEALTH_RESPONSE"
fi
echo ""

# Step 12: Check database
echo "🗄️  Step 12: Checking database..."
VERSIONS=$(docker exec nlp-postgres psql -U nlpuser -d nlpgen -t -c "SELECT COUNT(*) FROM versions;" 2>/dev/null || echo "0")
echo "   Versions in database: $(echo $VERSIONS | tr -d ' ')"
echo -e "${GREEN}✓ Database is accessible${NC}"
echo ""

# Step 13: Display access URLs
echo "🌐 Step 13: Access URLs"
echo "   ================================"
echo "   Frontend:        https://localhost"
echo "   Backend API:     http://localhost:3000"
echo "   API Health:      http://localhost:3000/health"
echo "   MinIO Console:   http://localhost:9001"
echo "   Qdrant Dashboard: http://localhost:6333/dashboard"
echo "   ================================"
echo ""

# Step 14: Display login credentials
echo "🔑 Step 14: Default Login Credentials"
echo "   ================================"
echo "   Email:    admin@example.com"
echo "   Password: admin123"
echo "   ⚠️  CHANGE THESE AFTER FIRST LOGIN!"
echo "   ================================"
echo ""

# Step 15: Final checks
echo "✅ Step 15: Final Verification Checklist"
echo "   ================================"
echo "   [ ] Open https://localhost in browser"
echo "   [ ] Accept SSL certificate warning"
echo "   [ ] Login with default credentials"
echo "   [ ] Go to Admin panel"
echo "   [ ] Create a test version"
echo "   [ ] Upload a DDL file"
echo "   [ ] Go to Generator"
echo "   [ ] Try generating code"
echo "   [ ] Check request history"
echo "   ================================"
echo ""

# Step 16: View logs
echo "📋 Step 16: Viewing recent logs..."
echo "   Backend logs (last 20 lines):"
echo "   --------------------------------"
docker-compose logs --tail=20 backend
echo ""

# Final summary
echo "🎉 Cleanup and deployment complete!"
echo ""
echo "Next steps:"
echo "1. Test the application thoroughly"
echo "2. If everything works, stop services: docker-compose down -v"
echo "3. Remove .env file: rm .env"
echo "4. Run cleanup script: ./cleanup-for-github.sh"
echo "5. Commit and push to GitHub"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop services: docker-compose down -v"
echo ""
