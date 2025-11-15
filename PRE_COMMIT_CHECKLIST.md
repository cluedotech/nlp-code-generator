# Pre-Commit Checklist

Complete this checklist before committing to GitHub.

## 🔒 Security Check

```bash
# Check for .env file (should NOT be tracked)
git status | grep .env
# Should only show .env.example

# Check for API keys in code
git grep -i "sk-proj\|sk-[a-zA-Z0-9]" || echo "No API keys found"

# Check for passwords
git grep -i "password.*=.*['\"]" --and --not -e "password.*change" --and --not -e "password.*your" || echo "No hardcoded passwords"

# Verify .gitignore is working
git check-ignore .env node_modules dist
# All should be ignored
```

## 📁 Files to Remove Before Commit

- [ ] `.env` (keep only `.env.example`)
- [ ] `node_modules/` directories
- [ ] `dist/` and `build/` directories
- [ ] `*.log` files
- [ ] `MIGRATION_FIX.md`
- [ ] `PUBLISH_CHECKLIST.md`
- [ ] `PRE_COMMIT_CHECKLIST.md` (this file)
- [ ] `final-test.sh` (optional)
- [ ] `cleanup-for-github.sh` (optional)
- [ ] `GITHUB_READY.md` (optional)

## 🧪 Final Tests

- [ ] Fresh Docker build works: `docker-compose build`
- [ ] Fresh deployment works: `docker-compose up -d`
- [ ] Backend health check passes: `curl http://localhost:3000/health/ready`
- [ ] Frontend loads at https://localhost
- [ ] Can login with default credentials
- [ ] Can create a version
- [ ] Can upload files
- [ ] Can generate code
- [ ] All services show as healthy: `docker-compose ps`

## 📝 Documentation Check

- [ ] README.md has correct repository URL
- [ ] LICENSE has correct name and year
- [ ] CONTRIBUTING.md has correct repository URL
- [ ] .env.example has no real credentials
- [ ] All placeholder text replaced with actual content

## 🎯 Git Status Check

```bash
# What will be committed?
git status

# Review changes
git diff

# Check for large files
find . -type f -size +10M | grep -v node_modules | grep -v .git

# Verify no secrets
git diff | grep -i "api.key\|password\|secret" || echo "No secrets found"
```

## ✅ Ready to Commit

If all checks pass, run:

```bash
# Add all files
git add .

# Commit
git commit -m "Initial commit: NLP Code Generator v1.0.0

- AI-powered code generation with RAG
- Support for SQL, n8n, and Form.io
- Version management system
- Admin dashboard
- Docker deployment ready
"

# Push to GitHub
git push -u origin main
```

## 🎉 Post-Commit

- [ ] Verify repository looks good on GitHub
- [ ] Check README renders correctly
- [ ] Verify no sensitive files are visible
- [ ] Add repository topics/tags
- [ ] Enable GitHub Issues
- [ ] Star your own repository ⭐

---

**Delete this file after committing**: `rm PRE_COMMIT_CHECKLIST.md`
