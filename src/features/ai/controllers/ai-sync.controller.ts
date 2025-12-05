import {
  Controller,
  Post,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Queue } from 'bullmq';
import { SyncService } from '../services/sync.service';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Report, ReportDocument } from '../../report/schema/report.schema';

@ApiTags('AI Sync')
@Controller('ai/sync')
@UseGuards(AuthGuard)
export class AISyncController {
  constructor(
    private syncService: SyncService,
    @InjectQueue('ai-indexing') private indexingQueue: Queue,
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
  ) {}

  @Post('reports')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync all reports to Qdrant vector database' })
  @ApiResponse({
    status: 200,
    description: 'Reports queued for indexing',
  })
  async syncAllReports() {
    const result = await this.syncService.syncAllReports(this.reportModel);
    return {
      success: true,
      message: `Đã queue ${result.indexed} reports để index. ${result.failed} reports thất bại.`,
      data: result,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get sync status and queue information' })
  @ApiResponse({
    status: 200,
    description: 'Sync status information',
  })
  async getSyncStatus() {
    // Get queue stats
    const [waiting, active, completed, failed] = await Promise.all([
      this.indexingQueue.getWaitingCount(),
      this.indexingQueue.getActiveCount(),
      this.indexingQueue.getCompletedCount(),
      this.indexingQueue.getFailedCount(),
    ]);

    return {
      success: true,
      data: {
        queue: {
          waiting,
          active,
          completed,
          failed,
        },
        message: 'Use POST /api/ai/sync/reports to start indexing',
      },
    };
  }
}
