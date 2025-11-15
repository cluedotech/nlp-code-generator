# Contributing to NLP Code Generator

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## 🤝 How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/cluedotech/nlp-code-generator/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Docker version, etc.)
   - Logs if applicable

### Suggesting Features

1. Check existing [Issues](https://github.com/cluedotech/nlp-code-generator/issues) for similar suggestions
2. Create a new issue with:
   - Clear use case description
   - Expected behavior
   - Why this feature would be useful
   - Possible implementation approach

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write or update tests if applicable
5. Update documentation
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📝 Development Guidelines

### Code Style

- **TypeScript**: Follow the existing code style
- **Naming**: Use descriptive variable and function names
- **Comments**: Add comments for complex logic
- **Types**: Always use TypeScript types, avoid `any`

### Commit Messages

Follow conventional commits format:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(backend): add support for custom LLM models
fix(frontend): resolve file upload timeout issue
docs(readme): update installation instructions
```

### Testing

- Write tests for new features
- Ensure existing tests pass
- Test with Docker Compose before submitting PR

### Documentation

- Update README.md if adding new features
- Update API.md for API changes
- Add inline code comments for complex logic
- Update DEPLOYMENT.md for infrastructure changes

## 🏗️ Project Structure

```
nlp-code-generator/
├── backend/          # Node.js/Express backend
│   ├── src/
│   │   ├── routes/   # API endpoints
│   │   ├── services/ # Business logic
│   │   ├── models/   # Data models
│   │   └── middleware/ # Express middleware
├── frontend/         # React frontend
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/    # Page components
│   │   ├── hooks/    # Custom hooks
│   │   └── lib/      # Utilities
└── shared/           # Shared TypeScript types
```

## 🧪 Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Integration tests
docker-compose -f docker-compose.test.yml up
```

## 🐛 Debugging

### Backend Debugging

```bash
# View backend logs
docker-compose logs -f backend

# Access backend container
docker exec -it nlp-backend sh

# Check database
docker exec -it nlp-postgres psql -U nlpuser -d nlpgen
```

### Frontend Debugging

```bash
# View frontend logs
docker-compose logs -f frontend

# Run frontend locally
cd frontend
npm run dev
```

## 📚 Resources

- [Project Documentation](./README.md)
- [API Documentation](./API.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Demo Setup](./DEMO_SETUP.md)

## ❓ Questions?

Feel free to:
- Open an issue for questions
- Join our discussions
- Reach out to maintainers

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🎉
