import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { QdrantService } from './qdrant.service';
// SyncService không cần AI service trực tiếp
import { IndexedDocument } from '../schemas/indexed-document.schema';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v5 as uuidv5 } from 'uuid';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  // UUID namespace for IUH CSVC (fixed namespace for consistent UUID generation)
  private readonly UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  constructor(
    private readonly qdrantService: QdrantService,
    @InjectModel(IndexedDocument.name)
    private indexedDocModel: Model<IndexedDocument>,
    @InjectQueue('ai-indexing') private indexingQueue: Queue,
  ) {}

  /**
   * Convert MongoDB ObjectID to UUID v5 (deterministic)
   * Same ObjectID always produces same UUID
   */
  private mongoIdToUUID(objectId: string): string {
    return uuidv5(objectId, this.UUID_NAMESPACE);
  }

  /**
   * Sync report when created
   * @param report Report document
   */
  async onReportCreated(report: any): Promise<void> {
    try {
      const mongoId = report._id.toString();
      const vectorId = this.mongoIdToUUID(mongoId); // Convert to UUID
      const text = this.formatReportText(report);

      this.logger.log(`Converting Report ID ${mongoId} → UUID ${vectorId}`);

      await this.indexingQueue.add(
        'index-document',
        {
          vectorId,
          mongoId, // Keep MongoDB ID for tracking
          sourceType: 'report',
          sourceId: mongoId,
          text,
          metadata: {
            title: `Report ${report.type}`,
            category: report.type,
            location: report.asset?.zone?.name || report.asset?.area?.name,
            status: report.status,
            priority: report.priority, // Include priority in metadata
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
      const mongoId = report._id.toString();
      const vectorId = this.mongoIdToUUID(mongoId);

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
      const vectorId = this.mongoIdToUUID(reportId);

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
        .populate({
          path: 'asset',
          populate: [
            {
              path: 'zone',
              select: 'name',
            },
            {
              path: 'area',
              select: 'name',
            },
          ],
        })
        .populate('createdBy', 'fullName email')
        .lean();

      let indexed = 0;
      let failed = 0;

      // Batch process to avoid overwhelming queue
      const batchSize = 50;
      for (let i = 0; i < reports.length; i += batchSize) {
        const batch = reports.slice(i, i + batchSize);

        const batchJobs = batch.map((report: any) => {
          const mongoId = String(report._id);
          return {
            name: 'index-document',
            data: {
              vectorId: this.mongoIdToUUID(mongoId),
              mongoId,
              sourceType: 'report',
              sourceId: mongoId,
              text: this.formatReportText(report),
              metadata: {
                title: `Report ${report.type}`,
                category: report.type,
                location: report.asset?.zone?.name || report.asset?.area?.name,
                status: report.status,
                priority: report.priority, // Include priority in metadata
                createdAt: report.createdAt,
              },
            },
            opts: {
              attempts: 3,
              backoff: { type: 'exponential', delay: 2000 },
            },
          };
        });

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
   * Sync knowledge when created
   * @param knowledge Knowledge document
   */
  async onKnowledgeCreated(knowledge: any): Promise<void> {
    try {
      const mongoId = knowledge._id.toString();
      const vectorId = this.mongoIdToUUID(mongoId); // Convert to UUID
      const text = this.formatKnowledgeText(knowledge);

      this.logger.log(`Converting Knowledge ID ${mongoId} → UUID ${vectorId}`);

      await this.indexingQueue.add(
        'index-document',
        {
          vectorId,
          mongoId,
          sourceType: knowledge.type.toLowerCase(), // 'faq', 'sop', 'facilities'
          sourceId: mongoId,
          text,
          metadata: {
            title: knowledge.title,
            category: knowledge.category,
            type: knowledge.type,
            tags: knowledge.tags,
            createdAt: knowledge.createdAt,
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

      this.logger.log(`Queued knowledge ${vectorId} for indexing`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error queueing knowledge for indexing: ${errorMessage}`,
        errorStack,
      );
    }
  }

  /**
   * Sync knowledge when updated
   * @param knowledge Updated knowledge
   */
  async onKnowledgeUpdated(knowledge: any): Promise<void> {
    try {
      const mongoId = knowledge._id.toString();
      const vectorId = this.mongoIdToUUID(mongoId);
      const text = this.formatKnowledgeText(knowledge);

      // Re-index completely (update content + embedding)
      await this.indexingQueue.add('index-document', {
        vectorId,
        mongoId,
        sourceType: knowledge.type.toLowerCase(),
        sourceId: mongoId,
        text,
        metadata: {
          title: knowledge.title,
          category: knowledge.category,
          type: knowledge.type,
          tags: knowledge.tags,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Queued knowledge ${vectorId} for re-indexing`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error updating knowledge: ${errorMessage}`,
        errorStack,
      );
    }
  }

  /**
   * Sync knowledge when deleted
   * @param knowledgeId Knowledge ID
   */
  async onKnowledgeDeleted(knowledgeId: string): Promise<void> {
    try {
      const vectorId = this.mongoIdToUUID(knowledgeId);

      await this.qdrantService.deleteDocument(vectorId);
      await this.indexedDocModel.updateOne(
        { vectorId },
        { $set: { isActive: false } },
      );

      this.logger.log(`Deleted knowledge ${vectorId} from index`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error deleting knowledge: ${errorMessage}`,
        errorStack,
      );
    }
  }

  /**
   * Format date to Vietnamese readable format
   * @param date Date object
   * @returns Formatted date string
   */
  private formatDateVietnamese(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!d || isNaN(d.getTime())) {
      return '';
    }

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Format: "lúc 10:30 sáng ngày 13/12/2025"
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    let timeStr = '';
    if (hours < 12) {
      timeStr = `${hours}:${minutes.toString().padStart(2, '0')} sáng`;
    } else if (hours === 12) {
      timeStr = `12:${minutes.toString().padStart(2, '0')} trưa`;
    } else {
      timeStr = `${hours - 12}:${minutes.toString().padStart(2, '0')} chiều`;
    }

    const dateStr = `ngày ${day}/${month}/${year}`;

    // Add relative time for recent reports
    let relativeStr = '';
    if (diffMins < 60) {
      relativeStr = ` (${diffMins} phút trước)`;
    } else if (diffHours < 24) {
      relativeStr = ` (${diffHours} giờ trước)`;
    } else if (diffDays === 1) {
      relativeStr = ' (hôm qua)';
    } else if (diffDays < 7) {
      relativeStr = ` (${diffDays} ngày trước)`;
    }

    return `lúc ${timeStr} ${dateStr}${relativeStr}`;
  }

  /**
   * Format report text for indexing
   * @param report Report document
   * @returns Formatted text
   */
  private formatReportText(report: any): string {
    const parts: string[] = [];

    // Include timestamp at the beginning for time-based queries
    if (report.createdAt) {
      const timeStr = this.formatDateVietnamese(report.createdAt);
      if (timeStr) {
        parts.push(`Thời gian báo cáo: ${timeStr}`);
      }
    }

    parts.push(`Loại báo cáo: ${report.type}`);
    parts.push(`Mô tả: ${report.description}`);

    // Include priority for emergency/critical reports
    if (report.priority) {
      const priorityLabels: Record<string, string> = {
        CRITICAL: 'khẩn cấp',
        HIGH: 'cao',
        MEDIUM: 'trung bình',
        LOW: 'thấp',
      };
      const priorityLabel = priorityLabels[report.priority] || report.priority;
      parts.push(`Mức độ ưu tiên: ${report.priority} (${priorityLabel})`);

      // Emphasize critical/high priority reports
      if (report.priority === 'CRITICAL') {
        parts.push('Sự kiện khẩn cấp cần xử lý ngay');
      } else if (report.priority === 'HIGH') {
        parts.push('Sự kiện quan trọng cần xử lý sớm');
      }
    }

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

    if (report.status) {
      parts.push(`Trạng thái: ${report.status}`);
    }

    return parts.join('\n');
  }

  /**
   * Format knowledge text for indexing
   * @param knowledge Knowledge document
   * @returns Formatted text
   */
  private formatKnowledgeText(knowledge: any): string {
    const parts: string[] = [];

    parts.push(`Tiêu đề: ${knowledge.title}`);
    parts.push(`Loại: ${knowledge.type}`);
    parts.push(`Nội dung: ${knowledge.content}`);

    if (knowledge.category) {
      parts.push(`Danh mục: ${knowledge.category}`);
    }

    if (knowledge.tags && knowledge.tags.length > 0) {
      parts.push(`Tags: ${knowledge.tags.join(', ')}`);
    }

    return parts.join('\n');
  }
}
