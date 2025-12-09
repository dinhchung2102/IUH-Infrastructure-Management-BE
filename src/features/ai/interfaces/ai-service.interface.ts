/**
 * Interface for AI services (Gemini, OpenAI, etc.)
 * All AI providers should implement this interface
 */
export interface AIService {
  /**
   * Generate embedding for single text
   * @param text Text to embed
   * @returns Vector embedding
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Batch generate embeddings
   * @param texts Array of texts
   * @returns Array of embeddings
   */
  batchGenerateEmbeddings(texts: string[]): Promise<number[][]>;

  /**
   * Chat completion
   * @param messages Array of messages
   * @param options Temperature, maxTokens
   * @returns Response content and usage
   */
  chatCompletion(
    messages: Array<{ role: string; content: string }>,
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<{
    content: string;
    usage: { promptTokens: number; completionTokens: number };
  }>;

  /**
   * RAG-specific chat with context
   * @param query User query
   * @param context Retrieved context
   * @param systemPrompt System instructions
   * @returns Answer and usage stats
   */
  chatWithContext(
    query: string,
    context: string,
    systemPrompt: string,
  ): Promise<{ answer: string; usage: any }>;
}
