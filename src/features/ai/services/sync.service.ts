import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { QdrantService } from './qdrant.service';
import { GeminiService } from './gemini.service';
import { IndexedDocument } from '../schemas/indexed-document.schema';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private qdrantService: QdrantService,
    private geminiService: GeminiService,
    @InjectModel(IndexedDocument.name)
    private indexedDocModel: Model<IndexedDocument>,
    @InjectQueue('ai-indexing') private indexingQueue: Queue,
  ) {}

  /**
   * Sync report when created
   * @param report Report document
   */
  async onReportCreated(report: any): Promise<void> {
    try {
      const vectorId = report._id.toString();
      const text = this.formatReportText(report);

      await this.indexingQueue.add(
        'index-document',
        {
          vectorId,
          sourceType: 'report',
          sourceId: report._id.toString(),
          text,
          metadata: {
            title: `Report ${report.type}`,
            category: report.type,
            location: report.asset?.zone?.name || report.asset?.area?.name,
            status: report.status,
            createdAt: report.createdAt,
          },
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      this.logger.log(`Queued report ${vectorId} for indexing`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error queueing report for indexing: ${errorMessage}`,
        errorStack,
      );
    }
  }

  /**
   * Sync report when updated
   * @param report Updated report
   */
  async onReportUpdated(report: any): Promise<void> {
    try {
      const vectorId = report._id.toString();

      // Update metadata only, không re-generate embedding
      await this.qdrantService.updatePayload(vectorId, {
        status: report.status,
        updatedAt: new Date(),
      });

      await this.indexedDocModel.updateOne(
        { vectorId },
        {
          $set: {
            lastSyncedAt: new Date(),
            'metadata.status': report.status,
          },
        },
      );

      this.logger.log(`Updated report ${vectorId} metadata`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error updating report: ${errorMessage}`, errorStack);
    }
  }

  /**
   * Sync report when deleted
   * @param reportId Report ID
   */
  async onReportDeleted(reportId: string): Promise<void> {
    try {
      const vectorId = reportId;

      await this.qdrantService.deleteDocument(vectorId);
      await this.indexedDocModel.updateOne(
        { vectorId },
        { $set: { isActive: false } },
      );

      this.logger.log(`Deleted report ${vectorId} from index`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error deleting report: ${errorMessage}`, errorStack);
    }
  }

  /**
   * Bulk sync all reports (initial setup)
   * @returns Stats about synced documents
   */
  async syncAllReports(
    reportModel: Model<any>,
  ): Promise<{ indexed: number; failed: number }> {
    try {
      this.logger.log('Starting bulk sync of all reports...');

      const reports = await reportModel
        .find()
        .populate('asset')
        .populate('createdBy')
        .lean();

      let indexed = 0;
      let failed = 0;

      // Batch process to avoid overwhelming queue
      const batchSize = 50;
      for (let i = 0; i < reports.length; i += batchSize) {
        const batch = reports.slice(i, i + batchSize);

        const batchJobs = batch.map((report: any) => ({
          name: 'index-document',
          data: {
            vectorId: String(report._id),
            sourceType: 'report',
            sourceId: String(report._id),
            text: this.formatReportText(report),
            metadata: {
              title: `Report ${report.type}`,
              category: report.type,
              location: report.asset?.zone?.name || report.asset?.area?.name,
              status: report.status,
              createdAt: report.createdAt,
            },
          },
          opts: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          },
        }));

        try {
          await this.indexingQueue.addBulk(batchJobs);
          indexed += batch.length;
          this.logger.log(
            `Queued batch ${i / batchSize + 1}: ${batch.length} reports`,
          );
        } catch (error) {
          failed += batch.length;
          this.logger.error(`Failed to queue batch: ${error.message}`);
        }
      }

      this.logger.log(
        `Bulk sync completed: ${indexed} queued, ${failed} failed`,
      );

      return { indexed, failed };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error in bulk sync: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Re-index a specific document
   * @param vectorId Vector ID
   */
  async reindexDocument(vectorId: string): Promise<void> {
    try {
      const indexedDoc = await this.indexedDocModel.findOne({ vectorId });

      if (!indexedDoc) {
        throw new Error(`Document ${vectorId} not found in index`);
      }

      await this.indexingQueue.add('index-document', {
        vectorId: indexedDoc.vectorId,
        sourceType: indexedDoc.sourceType,
        sourceId: indexedDoc.sourceId,
        text: indexedDoc.content,
        metadata: indexedDoc.metadata,
      });

      this.logger.log(`Queued document ${vectorId} for re-indexing`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error re-indexing document: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Format report text for indexing
   * @param report Report document
   * @returns Formatted text
   */
  private formatReportText(report: any): string {
    const parts: string[] = [];

    parts.push(`Loại báo cáo: ${report.type}`);
    parts.push(`Mô tả: ${report.description}`);

    if (report.asset) {
      parts.push(`Tài sản: ${report.asset.name} (${report.asset.code})`);
    }

    if (report.asset?.zone?.name) {
      parts.push(`Khu vực: ${report.asset.zone.name}`);
    }

    if (report.asset?.area?.name) {
      parts.push(`Khu: ${report.asset.area.name}`);
    }

    if (report.createdBy) {
      parts.push(`Người báo cáo: ${report.createdBy.fullName}`);
    }

    return parts.join('\n');
  }
}
