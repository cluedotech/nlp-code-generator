import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { VersionRepository } from '../repositories/VersionRepository';
import { CreateVersionDTO } from '../models/types';

const router = Router();
const versionRepository = new VersionRepository();

/**
 * GET /api/versions
 * Get all versions (accessible to all authenticated users)
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const versions = await versionRepository.findAll();
    res.status(200).json(versions);
  } catch (error) {
    console.error('Error fetching versions:', error);
    res.status(500).json({
      error: {
        code: 'VERSION_FETCH_ERROR',
        message: 'Failed to fetch versions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * GET /api/versions/:versionId
 * Get a specific version by ID
 */
router.get('/:versionId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { versionId } = req.params;
    const version = await versionRepository.findById(versionId);
    
    if (!version) {
      res.status(404).json({
        error: {
          code: 'VERSION_NOT_FOUND',
          message: 'Version not found',
        },
      });
      return;
    }
    
    res.status(200).json(version);
  } catch (error) {
    console.error('Error fetching version:', error);
    res.status(500).json({
      error: {
        code: 'VERSION_FETCH_ERROR',
        message: 'Failed to fetch version',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * POST /api/versions
 * Create a new version (admin only)
 */
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    
    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Version name is required and must be a non-empty string',
        },
      });
      return;
    }
    
    // Check if version with same name already exists
    const existingVersion = await versionRepository.findByName(name.trim());
    if (existingVersion) {
      res.status(409).json({
        error: {
          code: 'VERSION_ALREADY_EXISTS',
          message: `Version with name '${name.trim()}' already exists`,
        },
      });
      return;
    }
    
    const versionData: CreateVersionDTO = {
      name: name.trim(),
      description: description?.trim() || undefined,
    };
    
    const newVersion = await versionRepository.create(versionData);
    res.status(201).json(newVersion);
  } catch (error) {
    console.error('Error creating version:', error);
    res.status(500).json({
      error: {
        code: 'VERSION_CREATE_ERROR',
        message: 'Failed to create version',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * PUT /api/versions/:versionId
 * Update a version (admin only)
 */
router.put('/:versionId', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { versionId } = req.params;
    const { name, description } = req.body;
    
    // Check if version exists
    const existingVersion = await versionRepository.findById(versionId);
    if (!existingVersion) {
      res.status(404).json({
        error: {
          code: 'VERSION_NOT_FOUND',
          message: 'Version not found',
        },
      });
      return;
    }
    
    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Version name must be a non-empty string',
        },
      });
      return;
    }
    
    // Check if new name conflicts with existing version
    if (name && name.trim() !== existingVersion.name) {
      const conflictingVersion = await versionRepository.findByName(name.trim());
      if (conflictingVersion) {
        res.status(409).json({
          error: {
            code: 'VERSION_ALREADY_EXISTS',
            message: `Version with name '${name.trim()}' already exists`,
          },
        });
        return;
      }
    }
    
    const updates: Partial<CreateVersionDTO> = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || undefined;
    
    const updatedVersion = await versionRepository.update(versionId, updates);
    res.status(200).json(updatedVersion);
  } catch (error) {
    console.error('Error updating version:', error);
    res.status(500).json({
      error: {
        code: 'VERSION_UPDATE_ERROR',
        message: 'Failed to update version',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * DELETE /api/versions/:versionId
 * Delete a version (admin only)
 * Note: This will cascade delete all associated files due to foreign key constraints
 */
router.delete('/:versionId', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { versionId } = req.params;
    
    // Check if version exists
    const existingVersion = await versionRepository.findById(versionId);
    if (!existingVersion) {
      res.status(404).json({
        error: {
          code: 'VERSION_NOT_FOUND',
          message: 'Version not found',
        },
      });
      return;
    }
    
    const deleted = await versionRepository.delete(versionId);
    
    if (deleted) {
      res.status(200).json({
        success: true,
        message: `Version '${existingVersion.name}' deleted successfully`,
      });
    } else {
      res.status(500).json({
        error: {
          code: 'VERSION_DELETE_ERROR',
          message: 'Failed to delete version',
        },
      });
    }
  } catch (error) {
    console.error('Error deleting version:', error);
    res.status(500).json({
      error: {
        code: 'VERSION_DELETE_ERROR',
        message: 'Failed to delete version',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

export default router;

/**
 * POST /api/versions/:versionId/cache/warm
 * Warm cache for a specific version (admin only)
 */
router.post('/:versionId/cache/warm', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { versionId } = req.params;
    
    // Check if version exists
    const version = await versionRepository.findById(versionId);
    if (!version) {
      res.status(404).json({
        error: {
          code: 'VERSION_NOT_FOUND',
          message: 'Version not found',
        },
      });
      return;
    }
    
    // Import cache service
    const versionCacheService = (await import('../services/VersionCacheService')).default;
    await versionCacheService.warmCache(versionId, version.name);
    
    res.status(200).json({
      success: true,
      message: `Cache warmed for version '${version.name}'`,
    });
  } catch (error) {
    console.error('Error warming cache:', error);
    res.status(500).json({
      error: {
        code: 'CACHE_WARM_ERROR',
        message: 'Failed to warm cache',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * DELETE /api/versions/:versionId/cache
 * Invalidate cache for a specific version (admin only)
 */
router.delete('/:versionId/cache', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { versionId } = req.params;
    
    // Import cache service
    const versionCacheService = (await import('../services/VersionCacheService')).default;
    await versionCacheService.invalidateVersionCache(versionId);
    
    res.status(200).json({
      success: true,
      message: 'Cache invalidated successfully',
    });
  } catch (error) {
    console.error('Error invalidating cache:', error);
    res.status(500).json({
      error: {
        code: 'CACHE_INVALIDATE_ERROR',
        message: 'Failed to invalidate cache',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});
