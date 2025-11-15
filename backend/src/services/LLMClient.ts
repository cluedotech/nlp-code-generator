import OpenAI from 'openai';

interface LLMResponse {
  content: string;
  tokensUsed: number;
  model: string;
}

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
}

export class LLMClient {
  private openai: OpenAI;
  private model: string;
  private retryConfig: RetryConfig;

  constructor() {
    const apiKey = process.env.LLM_API_KEY;
    const baseURL = process.env.LLM_API_URL;

    if (!apiKey) {
      throw new Error('LLM_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey,
      baseURL: baseURL || 'https://api.openai.com/v1',
      timeout: 30000, // 30 seconds timeout
    });

    this.model = process.env.LLM_MODEL || 'gpt-4-turbo-preview';
    
    this.retryConfig = {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      timeoutMs: 30000,
    };
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const delay = this.retryConfig.initialDelayMs * Math.pow(2, attempt);
    return Math.min(delay, this.retryConfig.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Retry on rate limits, timeouts, and server errors
    if (error?.status) {
      return error.status === 429 || error.status >= 500;
    }
    
    // Retry on network errors
    if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT') {
      return true;
    }
    
    return false;
  }

  /**
   * Generate completion with retry logic and timeout handling
   */
  async generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    temperature: number = 0.7
  ): Promise<LLMResponse> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.retryConfig.timeoutMs);

        const response = await this.openai.chat.completions.create(
          {
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature,
          },
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        const content = response.choices[0]?.message?.content || '';
        const tokensUsed = response.usage?.total_tokens || 0;

        console.log(`LLM completion successful. Tokens used: ${tokensUsed}`);

        return {
          content,
          tokensUsed,
          model: response.model,
        };
      } catch (error: any) {
        lastError = error;
        
        // Handle timeout
        if (error.name === 'AbortError') {
          console.error(`LLM request timeout (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1})`);
        } else {
          console.error(`LLM request failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}):`, error.message);
        }

        // Don't retry if it's the last attempt or error is not retryable
        if (attempt === this.retryConfig.maxRetries || !this.isRetryableError(error)) {
          break;
        }

        // Wait before retrying with exponential backoff
        const delay = this.calculateBackoffDelay(attempt);
        console.log(`Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    // All retries failed
    throw new Error(`LLM request failed after ${this.retryConfig.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Generate streaming completion (for future use)
   */
  async *generateStreamingCompletion(
    systemPrompt: string,
    userPrompt: string,
    temperature: number = 0.7
  ): AsyncGenerator<string, void, unknown> {
    const stream = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  }
}

// Export singleton instance
export const llmClient = new LLMClient();
