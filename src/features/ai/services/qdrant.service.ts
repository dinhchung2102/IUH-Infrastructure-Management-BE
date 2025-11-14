import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient;
  private readonly collectionName = 'iuh_csvc_knowledge';
  private readonly vectorSize = 768; // Gemini embedding dimension

  constructor(private configService: ConfigService) {
    const qdrantUrl =
      this.configService.get<string>('QDRANT_URL') || 'http://localhost:6333';
    this.client = new QdrantClient({ url: qdrantUrl });
    this.logger.log(`Qdrant client initialized with URL: ${qdrantUrl}`);
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  /**
   * Tạo collection nếu chưa tồn tại
   */
  async ensureCollection(): Promise<void> {
    try {
      const exists = await this.collectionExists();

      if (!exists) {
        this.logger.log(
          `Creating collection '${this.collectionName}' with vector size ${this.vectorSize}...`,
        );

        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: 'Cosine',
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        });

        this.logger.log(
          `Collection '${this.collectionName}' created successfully`,
        );
      } else {
        this.logger.log(`Collection '${this.collectionName}' already exists`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error ensuring collection: ${errorMessage}`,
        errorStack,
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
      await this.client.upsert(this.collectionName, {
        points: [
          {
            id,
            vector,
            payload,
          },
        ],
      });

      this.logger.debug(`Upserted document ${id} to Qdrant`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error upserting document ${id}: ${errorMessage}`,
        errorStack,
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
      throw error;
    }
  }

  /**
   * Get document by ID
   * @param id Document ID
   * @returns Document or null
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getDocument(id: string): Promise<any | null> {
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
