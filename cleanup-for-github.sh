#!/bin/bash

# Cleanup script for GitHub publication
# This script removes sensitive data and build artifacts

echo "🧹 Cleaning up for GitHub publication..."
echo ""

# Remove build artifacts
echo "📦 Removing build artifacts..."
rm -rf backend/node_modules
rm -rf backend/dist
rm -rf frontend/node_modules
rm -rf frontend/dist
echo "✓ Build artifacts removed"
echo ""

# Remove logs
echo "📝 Removing log files..."
find . -name "*.log" -type f -delete
rm -rf logs/
echo "✓ Log files removed"
echo ""

# Remove .env (keep .env.example)
echo "🔒 Removing .env file..."
if [ -f .env ]; then
    rm -f .env
    echo "✓ .env file removed"
else
    echo "✓ No .env file found"
fi
echo ""

# Remove Kiro directory (optional)
echo "🗂️  Removing .kiro directory..."
if [ -d .kiro ]; then
    read -p "Remove .kiro directory? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf .kiro
        echo "✓ .kiro directory removed"
    else
        echo "✓ .kiro directory kept"
    fi
else
    echo "✓ No .kiro directory found"
fi
echo ""

# Remove internal documentation
echo "📄 Removing internal documentation..."
rm -f MIGRATION_FIX.md
rm -f PUBLISH_CHECKLIST.md
echo "✓ Internal documentation removed"
echo ""

# Remove Docker volumes (optional)
echo "🐳 Docker cleanup..."
read -p "Remove Docker volumes and images? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose down -v 2>/dev/null || true
    echo "✓ Docker volumes removed"
else
    echo "✓ Docker volumes kept"
fi
echo ""

# Remove this cleanup script
echo "🗑️  Removing cleanup script..."
read -p "Remove this cleanup script? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f cleanup-for-github.sh
    echo "✓ Cleanup script will be removed"
else
    echo "✓ Cleanup script kept"
fi
echo ""

echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Review changes: git status"
echo "2. Verify .env is not tracked: git check-ignore .env"
echo "3. Update README.md with your details"
echo "4. Update LICENSE with your name"
echo "5. Test fresh build: docker-compose up -d"
echo "6. Commit and push to GitHub"
echo ""
echo "Happy publishing! 🚀"
