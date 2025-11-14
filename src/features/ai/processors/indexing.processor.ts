import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GeminiService } from '../services/gemini.service';
import { QdrantService } from '../services/qdrant.service';
import { IndexedDocument } from '../schemas/indexed-document.schema';

@Processor('ai-indexing')
export class IndexingProcessor extends WorkerHost {
  private readonly logger = new Logger(IndexingProcessor.name);

  constructor(
    private geminiService: GeminiService,
    private qdrantService: QdrantService,
    @InjectModel(IndexedDocument.name)
    private indexedDocModel: Model<IndexedDocument>,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case 'index-document':
        return this.handleIndexDocument(job);
      case 'batch-index':
        return this.handleBatchIndex(job);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  /**
   * Handle single document indexing
   */
  private async handleIndexDocument(job: Job) {
    const { vectorId, sourceType, sourceId, text, metadata } = job.data;

    try {
      this.logger.log(`[${job.id}] Indexing document ${vectorId}...`);

      // 1. Generate embedding
      await job.updateProgress(30);
      const embedding = await this.geminiService.generateEmbedding(text);

      // 2. Upsert to Qdrant
      await job.updateProgress(60);
      await this.qdrantService.upsertDocument(vectorId, embedding, {
        sourceType,
        sourceId,
        content: text.substring(0, 500), // Preview only
        ...metadata,
      });

      // 3. Save tracking to MongoDB
      await job.updateProgress(90);
      await this.indexedDocModel.findOneAndUpdate(
        { vectorId },
        {
          vectorId,
          sourceType,
          sourceId,
          content: text,
          metadata,
          embeddingDimension: 768,
          lastSyncedAt: new Date(),
          isActive: true,
        },
        { upsert: true, new: true },
      );

      await job.updateProgress(100);
      this.logger.log(`[${job.id}] ✓ Successfully indexed ${vectorId}`);

      return { success: true, vectorId };
    } catch (error) {
      this.logger.error(
        `[${job.id}] ✗ Failed to index ${vectorId}: ${error.message}`,
        error.stack,
      );
      throw error; // BullMQ will retry
    }
  }

  /**
   * Handle batch indexing
   */
  private async handleBatchIndex(job: Job) {
    const { documents } = job.data;

    try {
      this.logger.log(
        `[${job.id}] Batch indexing ${documents.length} documents...`,
      );

      // 1. Generate embeddings
      await job.updateProgress(30);
      const texts = documents.map((d: any) => d.text);
      const embeddings =
        await this.geminiService.batchGenerateEmbeddings(texts);

      // 2. Batch upsert to Qdrant
      await job.updateProgress(60);
      const points = documents.map((doc: any, i: number) => ({
        id: doc.vectorId,
        vector: embeddings[i],
        payload: {
          sourceType: doc.sourceType,
          content: doc.text.substring(0, 500),
          ...doc.metadata,
        },
      }));

      await this.qdrantService.batchUpsert(points);

      // 3. Bulk update MongoDB
      await job.updateProgress(90);
      const operations = documents.map((doc: any) => ({
        updateOne: {
          filter: { vectorId: doc.vectorId },
          update: {
            $set: {
              vectorId: doc.vectorId,
              sourceType: doc.sourceType,
              sourceId: doc.sourceId,
              content: doc.text,
              metadata: doc.metadata,
              embeddingDimension: 768,
              lastSyncedAt: new Date(),
              isActive: true,
            },
          },
          upsert: true,
        },
      }));

      await this.indexedDocModel.bulkWrite(operations);

      await job.updateProgress(100);
      this.logger.log(
        `[${job.id}] ✓ Successfully batch indexed ${documents.length} documents`,
      );

      return { success: true, count: documents.length };
    } catch (error) {
      this.logger.error(
        `[${job.id}] ✗ Failed to batch index: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
