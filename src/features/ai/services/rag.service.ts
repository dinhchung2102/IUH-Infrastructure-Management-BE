import { Injectable, Logger, Inject } from '@nestjs/common';
import type { AIService } from '../interfaces/ai-service.interface';
import { QdrantService } from './qdrant.service';
import { RedisService } from '../../../shared/redis/redis.service';

export interface RAGSearchResult {
  answer: string;
  sources: Array<{
    id: string;
    score: number;
    content: string;
    metadata: any;
  }>;
  usage: any;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ConversationHistory {
  userId: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);
  private readonly CONVERSATION_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_HISTORY_MESSAGES = 10; // Keep last 10 messages

  constructor(
    @Inject('AIService') private aiService: AIService,
    private qdrantService: QdrantService,
    private redisService: RedisService,
  ) {}

  /**
   * Main RAG query method
   * @param query User query
   * @param options Search options
   * @param userId User ID from token for conversation history
   * @returns Answer with sources
   */
  async query(
    query: string,
    options?: {
      sourceTypes?: string[];
      topK?: number;
      minScore?: number;
    },
    userId?: string,
  ): Promise<RAGSearchResult> {
    try {
      this.logger.log(`RAG Query: "${query}"`);

      // Load conversation history by user ID
      const conversationHistory = userId
        ? await this.getConversationHistory(userId)
        : null;
      const historyMessages = conversationHistory?.messages || [];

      if (userId) {
        this.logger.log(
          `User ID: ${userId}, History messages: ${historyMessages.length}`,
        );
      }

      // 1. Generate query embedding
      const queryVector = await this.aiService.generateEmbedding(query);

      // 2. Search Qdrant
      const filter = options?.sourceTypes
        ? {
            must: [
              {
                key: 'sourceType',
                match: { any: options.sourceTypes },
              },
            ],
          }
        : undefined;

      // Search WITHOUT threshold first to see all results
      const allResults = await this.qdrantService.search(queryVector, {
        limit: options?.topK || 8,
        scoreThreshold: undefined, // No threshold to see all results
        filter,
      });

      this.logger.log(
        `Search returned ${allResults.length} total results (no threshold)`,
      );
      if (allResults.length > 0) {
        this.logger.log(
          `Score range: ${allResults[0].score.toFixed(3)} to ${allResults[allResults.length - 1].score.toFixed(3)}`,
        );
      }

      // Filter by threshold manually
      const searchResults = allResults.filter(
        (r) => r.score >= (options?.minScore || 0.3),
      );

      this.logger.log(
        `Found ${searchResults.length} relevant documents (score >= ${options?.minScore || 0.3})`,
      );
      if (searchResults.length > 0) {
        this.logger.log(
          `Top result: ${searchResults[0].payload.title || 'No title'} (score: ${searchResults[0].score.toFixed(3)})`,
        );
      }

      // 3. Assemble context
      const context = this.assembleContext(searchResults);

      // 4. Generate answer với AI service (include conversation history)
      const systemPrompt = this.getSystemPrompt();
      const { answer, usage } = await this.aiService.chatWithContext(
        query,
        context,
        systemPrompt,
        historyMessages,
      );

      // 5. Save conversation history (only if userId provided)
      if (userId) {
        await this.saveConversationMessage(userId, 'user', query);
        await this.saveConversationMessage(userId, 'assistant', answer);
      }

      const result: RAGSearchResult = {
        answer,
        sources: searchResults.map((r) => ({
          id: r.id,
          score: r.score,
          content: r.payload.content || '',
          metadata: r.payload,
        })),
        usage,
      };

      return result;
    } catch (error) {
      this.logger.error(`Error in RAG query: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Specialized FAQ search
   */
  async chatFAQ(query: string): Promise<RAGSearchResult> {
    return this.query(query, {
      sourceTypes: ['faq'],
      topK: 5,
      minScore: 0.3, // Lower threshold for FAQ
    });
  }

  /**
   * Specialized facilities search
   */
  async searchFacilities(query: string): Promise<RAGSearchResult> {
    return this.query(query, {
      sourceTypes: ['facilities', 'facility', 'asset'],
      topK: 10,
      minScore: 0.3,
    });
  }

  /**
   * Specialized SOP/Policy search
   */
  async searchSOPs(query: string): Promise<RAGSearchResult> {
    return this.query(query, {
      sourceTypes: ['sop', 'policy'],
      topK: 8,
      minScore: 0.3,
    });
  }

  /**
   * Search reports for similar issues
   */
  async searchSimilarReports(query: string): Promise<RAGSearchResult> {
    return this.query(query, {
      sourceTypes: ['report'],
      topK: 10,
      minScore: 0.3,
    });
  }

  /**
   * Assemble context từ search results
   * @param results Search results from Qdrant
   * @returns Formatted context string
   */
  private assembleContext(results: any[]): string {
    if (results.length === 0) {
      return 'Không tìm thấy thông tin liên quan trong cơ sở dữ liệu.';
    }

    const contextParts = results.map((result, index) => {
      const metadata = result.payload;
      const content = metadata.content || '';
      const sourceType = metadata.sourceType || 'unknown';
      const title = metadata.title || `Document ${index + 1}`;

      return `[${index + 1}] ${title} (${sourceType}, score: ${result.score.toFixed(2)})
${content}
`;
    });

    return contextParts.join('\n---\n');
  }

  /**
   * Get system prompt cho RAG
   */
  private getSystemPrompt(): string {
    return `
Bạn là trợ lý AI thông minh của Trường Đại học Công nghiệp TP.HCM (IUH), 
chuyên hỗ trợ về quản lý cơ sở vật chất và giải đáp thắc mắc.

NHIỆM VỤ:
- Trả lời câu hỏi dựa trên thông tin trong CONTEXT được cung cấp
- Trả lời NGẮN GỌN, SÚCTRỌNG tâm, dễ hiểu
- Nếu không tìm thấy thông tin đủ rõ ràng, hãy nói rõ và đề xuất liên hệ bộ phận hỗ trợ
- Giữ giọng điệu thân thiện, chuyên nghiệp
- Trả lời bằng tiếng Việt
- KHÔNG trích dẫn nguồn dạng "Theo tài liệu [1]..." - trả lời trực tiếp
- Nếu có lịch sử cuộc trò chuyện, hãy tham khảo để hiểu ngữ cảnh

CHÚ Ý QUAN TRỌNG:
- KHÔNG bịa đặt thông tin không có trong CONTEXT
- Nếu CONTEXT không đủ thông tin để trả lời, hãy thừa nhận và đưa ra gợi ý
- Ưu tiên độ chính xác hơn là trả lời đầy đủ
- Trả lời ngắn gọn, KHÔNG dài dòng
    `.trim();
  }

  /**
   * Get conversation history from Redis by user ID
   */
  private async getConversationHistory(
    userId: string,
  ): Promise<ConversationHistory | null> {
    try {
      const key = `conversation:user:${userId}`;
      const history = await this.redisService.get<ConversationHistory>(key);
      return history || null;
    } catch (error) {
      this.logger.warn(`Failed to get conversation history: ${error.message}`);
      return null;
    }
  }

  /**
   * Save conversation message to Redis by user ID
   */
  private async saveConversationMessage(
    userId: string,
    role: 'user' | 'assistant',
    content: string,
  ): Promise<void> {
    try {
      const key = `conversation:user:${userId}`;
      let history = await this.getConversationHistory(userId);

      if (!history) {
        history = {
          userId,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      // Add new message
      history.messages.push({
        role,
        content,
        timestamp: new Date(),
      });

      // Keep only last N messages to avoid token limit
      if (history.messages.length > this.MAX_HISTORY_MESSAGES) {
        history.messages = history.messages.slice(-this.MAX_HISTORY_MESSAGES);
      }

      history.updatedAt = new Date();

      // Save to Redis with TTL
      await this.redisService.set(key, history, this.CONVERSATION_TTL);

      this.logger.debug(
        `Saved message to user ${userId} conversation (${history.messages.length} messages)`,
      );
    } catch (error) {
      this.logger.warn(`Failed to save conversation message: ${error.message}`);
      // Don't throw error, just log warning
    }
  }
}
