import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { authenticate } from '../middleware/auth';

const router = Router();
const authService = new AuthService();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
        },
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
        },
      });
      return;
    }

    // Validate password length
    if (password.length < 6) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 6 characters long',
        },
      });
      return;
    }

    // Validate role if provided
    if (role && role !== 'user' && role !== 'admin') {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Role must be either "user" or "admin"',
        },
      });
      return;
    }

    // Register user
    const result = await authService.register({ email, password, role });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User with this email already exists') {
        res.status(409).json({
          error: {
            code: 'USER_EXISTS',
            message: error.message,
          },
        });
        return;
      }
    }

    console.error('Registration error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to register user',
      },
    });
  }
});

/**
 * POST /api/auth/login
 * Login a user
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
        },
      });
      return;
    }

    // Login user
    const result = await authService.login({ email, password });

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Invalid email or password') {
        res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: error.message,
          },
        });
        return;
      }
    }

    console.error('Login error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to login',
      },
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information (requires authentication)
 */
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Get full user details
    const user = await authService.getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get user information',
      },
    });
  }
});

export default router;
