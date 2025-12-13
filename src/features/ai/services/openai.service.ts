import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AIService } from '../interfaces/ai-service.interface';

@Injectable()
export class OpenAIService implements AIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: OpenAI;
  private readonly chatModel: string;
  private readonly embeddingModel = 'text-embedding-3-small'; // 1536 dimensions

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_KEY is not configured in environment variables');
    }

    this.chatModel =
      this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';
    this.openai = new OpenAI({ apiKey });
    this.logger.log(`Initialized OpenAI with model: ${this.chatModel}`);
  }

  /**
   * Generate embedding cho single text
   * @param text Text cần embed
   * @returns Vector embedding 1536 dimensions
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });

      return response.data[0].embedding;
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
      // OpenAI supports batch embeddings natively
      const batchSize = 100; // OpenAI limit
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const response = await this.openai.embeddings.create({
          model: this.embeddingModel,
          input: batch,
        });

        const batchResults = response.data.map((item) => item.embedding);
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
   * Chat completion với OpenAI
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
      // Convert messages format to OpenAI format
      const openAIMessages = messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      }));

      const response = await this.openai.chat.completions.create({
        model: this.chatModel,
        messages: openAIMessages as Array<
          | { role: 'user'; content: string }
          | { role: 'assistant'; content: string }
          | { role: 'system'; content: string }
        >,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
      });

      const choice = response.choices[0];
      if (!choice || !choice.message) {
        throw new Error('No response from OpenAI');
      }

      return {
        content: choice.message.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
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
   * @param conversationHistory Optional conversation history
   * @returns Answer and usage stats
   */
  async chatWithContext(
    query: string,
    context: string,
    systemPrompt: string,
    conversationHistory?: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp?: Date;
    }>,
  ): Promise<{ answer: string; usage: any }> {
    try {
      const messages: Array<{ role: string; content: string }> = [];

      // Add system prompt
      messages.push({ role: 'system', content: systemPrompt });

      // Add conversation history if exists
      if (conversationHistory && conversationHistory.length > 0) {
        this.logger.log(
          `Including ${conversationHistory.length} previous messages in context`,
        );

        conversationHistory.forEach((msg) => {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        });
      }

      // Add current context and query
      messages.push({
        role: 'user',
        content: `CONTEXT:\n${context}\n\nQUESTION:\n${query}\n\nANSWER:`,
      });

      const result = await this.chatCompletion(messages, {
        temperature: 0.3,
        maxTokens: 1024,
      });

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
}
