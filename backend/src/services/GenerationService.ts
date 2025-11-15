import { llmClient } from './LLMClient';
import { ragEngine } from './RAGEngine';
import { buildPrompts, OutputType } from './PromptTemplates';
import { validateOutput, ValidationResult } from './OutputValidator';

export interface GenerationRequest {
  request: string;
  outputType: OutputType;
  versionId: string;
  userId: string;
}

export interface GenerationResult {
  generatedCode: string;
  metadata: {
    tokensUsed: number;
    processingTime: number;
    contextFiles: string[];
    model: string;
  };
  validation: ValidationResult;
}

export class GenerationService {
  /**
   * Generate code based on user request
   */
  async generateCode(generationRequest: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Starting code generation for user ${generationRequest.userId}`);
      console.log(`Output type: ${generationRequest.outputType}, Version: ${generationRequest.versionId}`);

      // Step 1: Retrieve relevant context using RAG
      const contextChunks = await ragEngine.retrieveContext(
        generationRequest.request,
        generationRequest.versionId,
        5 // Top 5 most relevant chunks
      );

      if (contextChunks.length === 0) {
        throw new Error('No context found for the specified version. Please ensure DDL files and documentation are uploaded.');
      }

      const contextString = ragEngine.buildContextString(contextChunks);
      const contextFiles = [...new Set(contextChunks.map(chunk => chunk.source))];

      console.log(`Retrieved context from ${contextFiles.length} files`);

      // Step 2: Build prompts based on output type
      const { systemPrompt, userPrompt } = buildPrompts(
        generationRequest.outputType,
        contextString,
        generationRequest.request
      );

      // Step 3: Call LLM to generate code
      console.log('Calling LLM for code generation...');
      const llmResponse = await llmClient.generateCompletion(
        systemPrompt,
        userPrompt,
        0.7 // Temperature for balanced creativity and consistency
      );

      // Step 4: Validate generated output
      const validation = validateOutput(llmResponse.content, generationRequest.outputType);

      if (!validation.isValid) {
        console.warn('Generated code has validation errors:', validation.errors);
      }

      if (validation.suggestions.length > 0) {
        console.log('Validation suggestions:', validation.suggestions);
      }

      const processingTime = Date.now() - startTime;

      console.log(`Code generation completed in ${processingTime}ms`);

      return {
        generatedCode: llmResponse.content,
        metadata: {
          tokensUsed: llmResponse.tokensUsed,
          processingTime,
          contextFiles,
          model: llmResponse.model,
        },
        validation,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`Code generation failed after ${processingTime}ms:`, error.message);
      throw error;
    }
  }

  /**
   * Detect if a request is ambiguous and needs clarification
   * Uses both heuristics and LLM-based analysis
   */
  async detectAmbiguity(request: string): Promise<{ isAmbiguous: boolean; clarificationPrompt?: string }> {
    // Quick heuristic checks first (fast path)
    const heuristicResult = this.checkAmbiguityHeuristics(request);
    if (heuristicResult.isAmbiguous) {
      return heuristicResult;
    }

    // For more complex cases, use LLM to detect ambiguity
    try {
      const llmResult = await this.checkAmbiguityWithLLM(request);
      return llmResult;
    } catch (error) {
      console.warn('LLM ambiguity check failed, falling back to heuristics:', error);
      // If LLM check fails, assume request is not ambiguous
      return { isAmbiguous: false };
    }
  }

  /**
   * Check for ambiguity using simple heuristics
   */
  private checkAmbiguityHeuristics(request: string): { isAmbiguous: boolean; clarificationPrompt?: string } {
    // Check for extremely short requests
    if (request.trim().length < 10) {
      return {
        isAmbiguous: true,
        clarificationPrompt: 'Your request is too short. Could you please provide more specific details about what you want to generate?',
      };
    }

    // Check for vague pronouns without context
    const vaguePronouns = /^(it|that|this|those|these)\b/i;
    if (vaguePronouns.test(request.trim())) {
      return {
        isAmbiguous: true,
        clarificationPrompt: 'Your request starts with a vague pronoun. Could you please specify what you are referring to?',
      };
    }

    // Check for multiple question marks (uncertainty)
    if (/\?{2,}/.test(request)) {
      return {
        isAmbiguous: true,
        clarificationPrompt: 'Your request seems uncertain. Could you please clarify exactly what you need?',
      };
    }

    // Check if request has reasonable length and structure
    // Most valid requests are at least 20 characters and contain action words
    const hasActionWord = /\b(get|find|list|show|display|create|generate|fetch|retrieve|select|query|search|filter|calculate|count|sum|average)\b/i.test(request);
    const hasReasonableLength = request.trim().length >= 20;

    if (!hasActionWord || !hasReasonableLength) {
      return {
        isAmbiguous: true,
        clarificationPrompt: 'Could you please provide more specific details about what you want to generate? Include what data you need and any specific conditions.',
      };
    }

    return { isAmbiguous: false };
  }

  /**
   * Use LLM to detect ambiguity in more complex cases
   */
  private async checkAmbiguityWithLLM(request: string): Promise<{ isAmbiguous: boolean; clarificationPrompt?: string }> {
    const systemPrompt = `You are an expert at analyzing user requests for code generation. Your task is to determine if a request is ambiguous or lacks sufficient detail to generate accurate code.

A request is ambiguous if:
- It lacks specific details about what needs to be generated
- It references undefined entities or concepts
- It has conflicting requirements
- It's too vague to understand the user's intent
- It requires information that wasn't provided

Respond with a JSON object in this format:
{
  "isAmbiguous": true/false,
  "clarificationPrompt": "A specific question to ask the user (only if ambiguous)"
}`;

    const userPrompt = `Analyze this code generation request and determine if it's ambiguous:

"${request}"

Is this request clear enough to generate code, or does it need clarification?`;

    try {
      const response = await llmClient.generateCompletion(
        systemPrompt,
        userPrompt,
        0.3 // Low temperature for consistent analysis
      );

      // Parse LLM response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          isAmbiguous: result.isAmbiguous === true,
          clarificationPrompt: result.isAmbiguous ? result.clarificationPrompt : undefined,
        };
      }

      // If we can't parse the response, assume not ambiguous
      return { isAmbiguous: false };
    } catch (error) {
      console.error('Error in LLM ambiguity detection:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const generationService = new GenerationService();
