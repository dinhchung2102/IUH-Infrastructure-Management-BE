import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private readonly embeddingModel = 'text-embedding-004';
  private chatModel: string;

  constructor(private configService: ConfigService) {
    this.chatModel =
      this.configService.get<string>('GEMINI_CHAT_MODEL') || 'gemini-2.0-flash';
    const apiKey = this.configService.get<string>('GEMINI_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_KEY is not configured in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Generate embedding cho single text
   * @param text Text cần embed
   * @returns Vector embedding 768 dimensions
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.embeddingModel,
      });

      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error generating embedding: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Batch generate embeddings (tiết kiệm API calls)
   * @param texts Array of texts
   * @returns Array of embeddings
   */
  async batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      // Batch embed với chunks để tránh timeout
      const batchSize = 50;
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map((text) => this.generateEmbedding(text)),
        );
        results.push(...batchResults);

        this.logger.debug(
          `Generated ${results.length}/${texts.length} embeddings`,
        );
      }

      return results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error batch generating embeddings: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Chat completion với Gemini
   * @param messages Array of messages
   * @param options Temperature, maxTokens
   * @returns Response content and usage
   */
  async chatCompletion(
    messages: Array<{ role: string; content: string }>,
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<{
    content: string;
    usage: { promptTokens: number; completionTokens: number };
  }> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.chatModel,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 2048,
        },
      });

      // Convert messages format to Gemini format
      const contents = messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const chat = model.startChat({
        history: contents.slice(0, -1),
      });

      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage(lastMessage.content);
      const response = result.response;

      return {
        content: response.text(),
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Error in chat completion: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * RAG-specific chat với context
   * @param query User query
   * @param context Retrieved context
   * @param systemPrompt System instructions
   * @returns Answer and usage stats
   */
  async chatWithContext(
    query: string,
    context: string,
    systemPrompt: string,
  ): Promise<{ answer: string; usage: any }> {
    try {
      const prompt = `${systemPrompt}

CONTEXT:
${context}

QUESTION:
${query}

ANSWER:`;

      const result = await this.chatCompletion(
        [{ role: 'user', content: prompt }],
        { temperature: 0.3, maxTokens: 1024 },
      );

      return {
        answer: result.content,
        usage: result.usage,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in chat with context: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Retry với exponential backoff
   * @param fn Function to retry
   * @param maxRetries Max retry attempts
   * @returns Result of function
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        this.logger.warn(
          `Attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}
