import { Router, Request, Response } from 'express';
import { authenticate, requireUser } from '../middleware/auth';
import { generationService } from '../services/GenerationService';
import { RequestHistoryRepository } from '../repositories/RequestHistoryRepository';
import { OutputType } from '../services/PromptTemplates';
import { AppError, asyncHandler } from '../middleware/errorHandler';

const router = Router();
const requestHistoryRepo = new RequestHistoryRepository();

/**
 * POST /api/generate
 * Generate code based on natural language request
 */
router.post('/generate', authenticate, requireUser, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { request, outputType, versionId } = req.body;
  const userId = req.user!.userId;

  // Validate request body
  if (!request || typeof request !== 'string' || request.trim().length === 0) {
    throw new AppError(
      'Request text is required and must be a non-empty string',
      400,
      'INVALID_REQUEST',
      ['Provide a clear description of what you want to generate']
    );
  }

  if (!outputType || !['sql', 'n8n', 'formio'].includes(outputType)) {
    throw new AppError(
      'Output type must be one of: sql, n8n, formio',
      400,
      'INVALID_OUTPUT_TYPE',
      ['Specify whether you want SQL, n8n workflow, or Form.io form']
    );
  }

  if (!versionId || typeof versionId !== 'string') {
    throw new AppError(
      'Version ID is required',
      400,
      'INVALID_VERSION',
      ['Select a valid version from the available options']
    );
  }

  // Note: Ambiguity detection disabled - RAG context provides schema information
  // The LLM will use the DDL files and documentation to understand the request
  
  // Generate code
  const result = await generationService.generateCode({
    request,
    outputType: outputType as OutputType,
    versionId,
    userId,
  });

  // Save to request history
  const historyEntry = await requestHistoryRepo.create({
    userId,
    versionId,
    requestText: request,
    outputType: outputType as OutputType,
    generatedCode: result.generatedCode,
    tokensUsed: result.metadata.tokensUsed,
    processingTimeMs: result.metadata.processingTime,
  });

  // Prepare response
  const response: any = {
    generatedCode: result.generatedCode,
    metadata: result.metadata,
    requestId: historyEntry.id,
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
}));

export default router;
