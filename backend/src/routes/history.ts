import { Router, Request, Response } from 'express';
import { authenticate, requireUser } from '../middleware/auth';
import { RequestHistoryRepository } from '../repositories/RequestHistoryRepository';
import { generationService } from '../services/GenerationService';
import { OutputType } from '../services/PromptTemplates';

const router = Router();
const requestHistoryRepo = new RequestHistoryRepository();

/**
 * GET /api/history
 * Get request history with pagination and filtering
 */
router.get('/history', authenticate, requireUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { limit, offset, outputType, versionId } = req.query;

    // Parse and validate pagination parameters
    const parsedLimit = limit ? parseInt(limit as string, 10) : 50;
    const parsedOffset = offset ? parseInt(offset as string, 10) : 0;

    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      res.status(400).json({
        error: {
          code: 'INVALID_LIMIT',
          message: 'Limit must be a number between 1 and 100',
        },
      });
      return;
    }

    if (isNaN(parsedOffset) || parsedOffset < 0) {
      res.status(400).json({
        error: {
          code: 'INVALID_OFFSET',
          message: 'Offset must be a non-negative number',
        },
      });
      return;
    }

    // Validate output type if provided
    if (outputType && !['sql', 'n8n', 'formio'].includes(outputType as string)) {
      res.status(400).json({
        error: {
          code: 'INVALID_OUTPUT_TYPE',
          message: 'Output type must be one of: sql, n8n, formio',
        },
      });
      return;
    }

    // Fetch history based on filters
    let history;
    let total;

    if (outputType && versionId) {
      // Filter by both output type and version
      history = await requestHistoryRepo.findByUserOutputTypeAndVersion(
        userId,
        outputType as OutputType,
        versionId as string,
        parsedLimit,
        parsedOffset
      );
      total = await requestHistoryRepo.countByUserOutputTypeAndVersion(
        userId,
        outputType as OutputType,
        versionId as string
      );
    } else if (outputType) {
      // Filter by output type only
      history = await requestHistoryRepo.findByUserAndOutputType(
        userId,
        outputType as OutputType,
        parsedLimit,
        parsedOffset
      );
      total = await requestHistoryRepo.countByUserAndOutputType(userId, outputType as OutputType);
    } else if (versionId) {
      // Filter by version only
      history = await requestHistoryRepo.findByUserAndVersion(
        userId,
        versionId as string,
        parsedLimit,
        parsedOffset
      );
      total = await requestHistoryRepo.countByUserAndVersion(userId, versionId as string);
    } else {
      // No filters, get all user history
      history = await requestHistoryRepo.findByUserId(userId, parsedLimit, parsedOffset);
      total = await requestHistoryRepo.countByUserId(userId);
    }

    res.status(200).json({
      data: history,
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset,
        total,
        hasMore: parsedOffset + parsedLimit < total,
      },
    });
  } catch (error: any) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_HISTORY_FAILED',
        message: 'Failed to fetch request history',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    });
  }
});

/**
 * GET /api/history/:requestId
 * Get a single request by ID
 */
router.get('/history/:requestId', authenticate, requireUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { requestId } = req.params;

    // Validate requestId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(requestId)) {
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST_ID',
          message: 'Request ID must be a valid UUID',
        },
      });
      return;
    }

    const request = await requestHistoryRepo.findById(requestId);

    if (!request) {
      res.status(404).json({
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'Request not found',
        },
      });
      return;
    }

    // Ensure user can only access their own requests
    if (request.userId !== userId) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this request',
        },
      });
      return;
    }

    res.status(200).json(request);
  } catch (error: any) {
    console.error('Error fetching request:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_REQUEST_FAILED',
        message: 'Failed to fetch request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    });
  }
});

/**
 * POST /api/history/:requestId/resubmit
 * Resubmit a previous request with optional modifications
 */
router.post('/history/:requestId/resubmit', authenticate, requireUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { requestId } = req.params;
    const { modifications } = req.body;

    // Validate requestId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(requestId)) {
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST_ID',
          message: 'Request ID must be a valid UUID',
        },
      });
      return;
    }

    // Fetch the original request
    const originalRequest = await requestHistoryRepo.findById(requestId);

    if (!originalRequest) {
      res.status(404).json({
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'Original request not found',
        },
      });
      return;
    }

    // Ensure user can only resubmit their own requests
    if (originalRequest.userId !== userId) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to resubmit this request',
        },
      });
      return;
    }

    // Determine the request text to use
    const requestText = modifications && typeof modifications === 'string' && modifications.trim().length > 0
      ? modifications.trim()
      : originalRequest.requestText;

    // Check for ambiguous requests
    const ambiguityCheck = await generationService.detectAmbiguity(requestText);
    if (ambiguityCheck.isAmbiguous) {
      res.status(400).json({
        error: {
          code: 'AMBIGUOUS_REQUEST',
          message: ambiguityCheck.clarificationPrompt,
          suggestions: ['Provide more specific details about what you want to generate'],
        },
      });
      return;
    }

    // Generate code using the same output type and version as the original
    const result = await generationService.generateCode({
      request: requestText,
      outputType: originalRequest.outputType,
      versionId: originalRequest.versionId,
      userId,
    });

    // Save to request history
    const historyEntry = await requestHistoryRepo.create({
      userId,
      versionId: originalRequest.versionId,
      requestText,
      outputType: originalRequest.outputType,
      generatedCode: result.generatedCode,
      tokensUsed: result.metadata.tokensUsed,
      processingTimeMs: result.metadata.processingTime,
    });

    // Prepare response
    const response: any = {
      generatedCode: result.generatedCode,
      metadata: result.metadata,
      requestId: historyEntry.id,
      originalRequestId: requestId,
    };

    // Include validation warnings if present
    if (!result.validation.isValid || result.validation.suggestions.length > 0) {
      response.validation = {
        isValid: result.validation.isValid,
        errors: result.validation.errors,
        suggestions: result.validation.suggestions,
      };
    }

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Resubmit error:', error);

    // Determine error type and response
    if (error.message.includes('No context found')) {
      res.status(404).json({
        error: {
          code: 'NO_CONTEXT',
          message: error.message,
          suggestions: [
            'Ensure DDL files and documentation are uploaded for the selected version',
            'Verify the version ID is correct',
          ],
        },
      });
      return;
    }

    if (error.message.includes('LLM request failed')) {
      res.status(503).json({
        error: {
          code: 'LLM_SERVICE_UNAVAILABLE',
          message: 'The code generation service is temporarily unavailable',
          suggestions: [
            'Please try again in a few moments',
            'If the problem persists, contact support',
          ],
        },
      });
      return;
    }

    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      res.status(504).json({
        error: {
          code: 'GENERATION_TIMEOUT',
          message: 'Code generation took too long and was cancelled',
          suggestions: [
            'Try simplifying your request',
            'Break complex requests into smaller parts',
          ],
        },
      });
      return;
    }

    // Generic error response
    res.status(500).json({
      error: {
        code: 'RESUBMIT_FAILED',
        message: 'Failed to resubmit request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    });
  }
});

export default router;
