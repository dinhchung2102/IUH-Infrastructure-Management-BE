import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { AIService } from '../interfaces/ai-service.interface';

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient;
  private collectionName = 'iuh_csvc_knowledge'; // Will be updated based on vector size
  private vectorSize: number | null = null; // Will be detected from AI service

  constructor(
    private configService: ConfigService,
    @Inject('AIService') private aiService: AIService,
  ) {
    const qdrantUrl =
      this.configService.get<string>('QDRANT_URL') || 'http://localhost:6333';
    this.client = new QdrantClient({
      url: qdrantUrl,
      apiKey: this.configService.get<string>('QDRANT_API_KEY'),
    });
    this.logger.log(`Qdrant client initialized with URL: ${qdrantUrl}`);
  }

  async onModuleInit() {
    try {
      // Detect vector size from AI service
      await this.detectVectorSize();
      await this.ensureCollection();
    } catch (error: unknown) {
      this.logger.error(
        'Failed to initialize Qdrant. AI features may not work properly.',
      );
      this.logger.error(
        'Please ensure Qdrant server is running and QDRANT_URL is correct in .env',
      );
      if (error instanceof Error) {
        this.logger.debug(`Error details: ${error.message}`);
      }
    }
  }

  /**
   * Detect vector size from AI service by generating a test embedding
   */
  private async detectVectorSize(): Promise<void> {
    try {
      this.logger.log('Detecting vector dimension from AI service...');
      const testEmbedding = await this.aiService.generateEmbedding('test');
      this.vectorSize = testEmbedding.length;

      // Update collection name based on vector size to avoid conflicts
      if (this.vectorSize === 1536) {
        this.collectionName = 'iuh_csvc_knowledge_openai'; // OpenAI collection
      } else if (this.vectorSize === 768) {
        this.collectionName = 'iuh_csvc_knowledge'; // Gemini collection (default)
      } else {
        this.collectionName = `iuh_csvc_knowledge_${this.vectorSize}`; // Other dimensions
      }

      const providerName =
        this.vectorSize === 768
          ? 'Gemini'
          : this.vectorSize === 1536
            ? 'OpenAI'
            : 'Unknown';
      this.logger.log(
        `Detected vector dimension: ${this.vectorSize} (${providerName})`,
      );
      this.logger.log(
        `Using collection: '${this.collectionName}' for ${providerName} embeddings`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to detect vector size, using default 768: ${errorMessage}`,
      );
      this.vectorSize = 768; // Fallback to Gemini dimension
      this.collectionName = 'iuh_csvc_knowledge'; // Default collection name
    }
  }

  /**
   * Tạo collection nếu chưa tồn tại
   */
  async ensureCollection(): Promise<void> {
    try {
      if (this.vectorSize === null) {
        await this.detectVectorSize();
      }

      const exists = await this.collectionExists();

      if (!exists) {
        this.logger.log(
          `Creating collection '${this.collectionName}' with vector size ${this.vectorSize}...`,
        );

        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize!,
            distance: 'Cosine',
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        });

        this.logger.log(
          `✓ Collection '${this.collectionName}' created successfully`,
        );
      } else {
        // Check if existing collection has correct dimension
        const collectionInfo = (await this.getCollectionInfo()) as {
          config?: { params?: { vectors?: { size?: number } } };
        };
        const existingSize =
          collectionInfo?.config?.params?.vectors?.size || 768;

        if (existingSize !== this.vectorSize) {
          this.logger.warn(
            `⚠ Collection '${this.collectionName}' exists with dimension ${existingSize}, but current AI service uses ${this.vectorSize}. ` +
              `This may cause errors. Consider recreating the collection or using the matching AI provider.`,
          );
        } else {
          this.logger.log(
            `✓ Collection '${this.collectionName}' already exists with correct dimension ${this.vectorSize}`,
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `✗ Error ensuring collection: ${errorMessage}`,
        errorStack,
      );
      this.logger.error(
        'Please check: 1) Qdrant server is running, 2) QDRANT_URL is correct in .env',
      );
      throw error;
    }
  }

  /**
   * Check if collection exists
   */
  async collectionExists(): Promise<boolean> {
    try {
      const collections = await this.client.getCollections();
      return collections.collections.some(
        (col) => col.name === this.collectionName,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error checking collection existence: ${errorMessage}`,
        errorStack,
      );
      return false;
    }
  }

  /**
   * Upsert single document
   * @param id Vector ID
   * @param vector Embedding vector
   * @param payload Metadata
   */
  async upsertDocument(
    id: string,
    vector: number[],
    payload: Record<string, any>,
  ): Promise<void> {
    try {
      // Detect vector size if not already detected
      if (this.vectorSize === null) {
        await this.detectVectorSize();
      }

      // Validate vector dimension
      if (this.vectorSize !== null && vector.length !== this.vectorSize) {
        throw new Error(
          `Vector dimension mismatch: expected ${this.vectorSize}, got ${vector.length}`,
        );
      }

      // Ensure collection exists before upserting
      const exists = await this.collectionExists();
      if (!exists) {
        this.logger.warn(
          `Collection '${this.collectionName}' does not exist. Creating...`,
        );
        await this.ensureCollection();
      }

      this.logger.debug(
        `Upserting ID: ${id}, Vector size: ${vector.length}, Payload: ${JSON.stringify(payload).substring(0, 200)}...`,
      );

      await this.client.upsert(this.collectionName, {
        points: [
          {
            id,
            vector,
            payload,
          },
        ],
      });

      this.logger.debug(`✓ Upserted document ${id} to Qdrant`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error upserting document ${id}: ${errorMessage}`,
        errorStack,
      );
      this.logger.error(
        `Details - Vector size: ${vector.length}, Expected: ${this.vectorSize || 'unknown'}, Payload keys: ${Object.keys(payload).join(', ')}`,
      );
      throw error;
    }
  }

  /**
   * Batch upsert documents
   * @param points Array of {id, vector, payload}
   */
  async batchUpsert(
    points: Array<{ id: string; vector: number[]; payload: any }>,
  ): Promise<void> {
    try {
      // Batch upsert với chunks để tránh timeout
      const batchSize = 100;

      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        await this.client.upsert(this.collectionName, {
          points: batch,
        });

        this.logger.debug(
          `Batch upserted ${Math.min(i + batchSize, points.length)}/${points.length} points`,
        );
      }

      this.logger.log(
        `Successfully upserted ${points.length} points to Qdrant`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error batch upserting: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Search similar vectors
   * @param queryVector Query embedding
   * @param options Search options
   * @returns Array of search results
   */
  async search(
    queryVector: number[],
    options: {
      limit?: number;
      scoreThreshold?: number;
      filter?: Record<string, any>;
    } = {},
  ): Promise<Array<{ id: string; score: number; payload: any }>> {
    try {
      // Detect vector size if not already detected
      if (this.vectorSize === null) {
        await this.detectVectorSize();
      }

      // Validate vector dimension before searching
      if (this.vectorSize !== null && queryVector.length !== this.vectorSize) {
        const collectionInfo = (await this.getCollectionInfo()) as {
          config?: { params?: { vectors?: { size?: number } } };
        };
        const existingSize =
          collectionInfo?.config?.params?.vectors?.size || 768;

        throw new Error(
          `Vector dimension mismatch: Query vector has ${queryVector.length} dimensions, ` +
            `but collection '${this.collectionName}' expects ${existingSize} dimensions. ` +
            `Current AI service uses ${this.vectorSize} dimensions. ` +
            `Please recreate the collection or switch to the matching AI provider.`,
        );
      }

      const searchResult = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit: options.limit || 10,
        score_threshold: options.scoreThreshold,
        filter: options.filter,
      });

      return searchResult.map((point) => ({
        id: point.id.toString(),
        score: point.score,
        payload: point.payload,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error searching: ${errorMessage}`, errorStack);

      // Provide helpful error message for dimension mismatch
      if (
        errorMessage.includes('Bad Request') ||
        errorMessage.includes('dimension')
      ) {
        this.logger.error(
          `\n⚠️  VECTOR DIMENSION MISMATCH DETECTED ⚠️\n` +
            `The collection may have been created with a different AI provider.\n` +
            `Current AI provider uses ${this.vectorSize || queryVector.length} dimensions.\n` +
            `Solution: Delete the collection '${this.collectionName}' and let the system recreate it, ` +
            `or switch back to the original AI provider.\n`,
        );
      }

      throw error;
    }
  }

  /**
   * Get document by ID
   * @param id Document ID
   * @returns Document or null
   */
  async getDocument(id: string): Promise<Record<string, unknown> | null> {
    try {
      const result = await this.client.retrieve(this.collectionName, {
        ids: [id],
      });

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error getting document ${id}: ${errorMessage}`,
        errorStack,
      );
      return null;
    }
  }

  /**
   * Delete document
   * @param id Document ID
   */
  async deleteDocument(id: string): Promise<void> {
    try {
      await this.client.delete(this.collectionName, {
        points: [id],
      });

      this.logger.debug(`Deleted document ${id} from Qdrant`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error deleting document ${id}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Update payload (metadata) only
   * @param id Document ID
   * @param payload New payload data
   */
  async updatePayload(id: string, payload: Record<string, any>): Promise<void> {
    try {
      await this.client.setPayload(this.collectionName, {
        points: [id],
        payload,
      });

      this.logger.debug(`Updated payload for document ${id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error updating payload for ${id}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(): Promise<unknown> {
    try {
      return await this.client.getCollection(this.collectionName);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error getting collection info: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Qdrant health check failed: ${errorMessage}`);
      return false;
    }
  }
}
