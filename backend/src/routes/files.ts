import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticate, requireAdmin } from '../middleware/auth';
import fileManagementService from '../services/FileManagementService';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

/**
 * POST /api/versions/:versionId/ddl
 * Upload DDL file for a specific version
 * Admin only
 */
router.post(
  '/versions/:versionId/ddl',
  authenticate,
  requireAdmin,
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { versionId } = req.params;
      const file = req.file;
      const userId = req.user?.userId;

      if (!file) {
        res.status(400).json({
          error: {
            code: 'NO_FILE',
            message: 'No file provided',
          },
        });
        return;
      }

      // Validate file extension
      if (!file.originalname.toLowerCase().endsWith('.sql')) {
        res.status(400).json({
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'DDL file must have .sql extension',
          },
        });
        return;
      }

      const fileMetadata = await fileManagementService.uploadDDLFile(
        versionId,
        file,
        userId
      );

      res.status(201).json({
        message: 'DDL file uploaded successfully',
        file: fileMetadata,
      });
    } catch (error: any) {
      console.error('Error uploading DDL file:', error);
      res.status(500).json({
        error: {
          code: 'UPLOAD_FAILED',
          message: error.message || 'Failed to upload DDL file',
        },
      });
    }
  }
);

/**
 * POST /api/versions/:versionId/docs
 * Upload supporting documents for a specific version
 * Admin only
 * Supports multiple file upload
 */
router.post(
  '/versions/:versionId/docs',
  authenticate,
  requireAdmin,
  upload.array('files', 10), // Allow up to 10 files at once
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { versionId } = req.params;
      const files = req.files as Express.Multer.File[];
      const userId = req.user?.userId;

      if (!files || files.length === 0) {
        res.status(400).json({
          error: {
            code: 'NO_FILES',
            message: 'No files provided',
          },
        });
        return;
      }

      // Upload all files
      const uploadedFiles = [];
      const errors = [];

      for (const file of files) {
        try {
          const fileMetadata = await fileManagementService.uploadSupportingDoc(
            versionId,
            file,
            userId
          );
          uploadedFiles.push(fileMetadata);
        } catch (error: any) {
          errors.push({
            filename: file.originalname,
            error: error.message,
          });
        }
      }

      if (errors.length > 0 && uploadedFiles.length === 0) {
        res.status(400).json({
          error: {
            code: 'ALL_UPLOADS_FAILED',
            message: 'All file uploads failed',
            details: errors,
          },
        });
        return;
      }

      res.status(201).json({
        message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
        files: uploadedFiles,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      console.error('Error uploading supporting documents:', error);
      res.status(500).json({
        error: {
          code: 'UPLOAD_FAILED',
          message: error.message || 'Failed to upload supporting documents',
        },
      });
    }
  }
);

/**
 * GET /api/versions/:versionId/files
 * Get all files for a specific version
 * Authenticated users can view
 */
router.get(
  '/versions/:versionId/files',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { versionId } = req.params;

      const files = await fileManagementService.getFilesByVersion(versionId);

      res.status(200).json({
        versionId,
        files,
        count: files.length,
      });
    } catch (error: any) {
      console.error('Error fetching files:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: error.message || 'Failed to fetch files',
        },
      });
    }
  }
);

/**
 * DELETE /api/files/:fileId
 * Delete a file by ID
 * Admin only
 */
router.delete(
  '/files/:fileId',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { fileId } = req.params;

      // Check if file exists
      const file = await fileManagementService.getFileById(fileId);
      if (!file) {
        res.status(404).json({
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found',
          },
        });
        return;
      }

      await fileManagementService.deleteFile(fileId);

      res.status(200).json({
        message: 'File deleted successfully',
        fileId,
      });
    } catch (error: any) {
      console.error('Error deleting file:', error);
      res.status(500).json({
        error: {
          code: 'DELETE_FAILED',
          message: error.message || 'Failed to delete file',
        },
      });
    }
  }
);

export default router;
