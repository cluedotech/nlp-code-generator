import { Router, Request, Response } from 'express';
import { authenticate, requireUser } from '../middleware/auth';

const router = Router();

/**
 * Example user endpoint (accessible by both users and admins)
 * This demonstrates how to protect user routes
 */
router.get('/profile', authenticate, requireUser, async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    message: 'User profile data',
    user: req.user,
  });
});

/**
 * Example endpoint for user-specific data
 */
router.get('/data', authenticate, requireUser, async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    message: 'User-specific data',
    user: req.user,
  });
});

export default router;
