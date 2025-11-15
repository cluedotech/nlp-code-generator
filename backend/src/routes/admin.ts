import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { ErrorLogRepository } from '../repositories/ErrorLogRepository';
import { asyncHandler, AppError } from '../middleware/errorHandler';

const router = Router();
const errorLogRepo = new ErrorLogRepository();

/**
 * Example admin-only endpoint
 * This demonstrates how to protect admin routes
 */
router.get('/dashboard', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    message: 'Admin dashboard data',
    user: req.user,
  });
});

/**
 * Example endpoint to get all users (admin only)
 */
router.get('/users', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  // This would typically fetch all users from the database
  res.status(200).json({
    message: 'List of all users (admin only)',
    user: req.user,
  });
});

/**
 * GET /api/admin/error-logs
 * Get recent error logs (admin only)
 */
router.get('/error-logs', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  if (limit < 1 || limit > 500) {
    throw new AppError(
      'Limit must be between 1 and 500',
      400,
      'INVALID_LIMIT'
    );
  }

  if (offset < 0) {
    throw new AppError(
      'Offset must be non-negative',
      400,
      'INVALID_OFFSET'
    );
  }

  const errorLogs = await errorLogRepo.findRecent(limit, offset);
  const totalCount = await errorLogRepo.count();

  res.status(200).json({
    errorLogs,
    pagination: {
      limit,
      offset,
      total: totalCount,
      hasMore: offset + limit < totalCount,
    },
  });
}));

/**
 * GET /api/admin/error-logs/:id
 * Get a specific error log by ID (admin only)
 */
router.get('/error-logs/:id', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const errorLog = await errorLogRepo.findById(id);

  if (!errorLog) {
    throw new AppError(
      'Error log not found',
      404,
      'ERROR_LOG_NOT_FOUND',
      ['Verify the error log ID is correct', 'The error log may have been deleted']
    );
  }

  res.status(200).json(errorLog);
}));

/**
 * DELETE /api/admin/error-logs/old
 * Delete error logs older than specified days (admin only)
 */
router.delete('/error-logs/old', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const days = parseInt(req.query.days as string) || 30;

  if (days < 1) {
    throw new AppError(
      'Days must be at least 1',
      400,
      'INVALID_DAYS'
    );
  }

  const deletedCount = await errorLogRepo.deleteOlderThan(days);

  res.status(200).json({
    message: `Successfully deleted error logs older than ${days} days`,
    deletedCount,
  });
}));

export default router;
