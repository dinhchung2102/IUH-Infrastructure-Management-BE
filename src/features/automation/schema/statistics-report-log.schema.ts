import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StatisticsReportLogDocument = StatisticsReportLog & Document;

@Schema({ timestamps: true })
export class StatisticsReportLog {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  recipientName: string;

  @Prop({ required: true, enum: ['month', 'quarter', 'year'] })
  period: 'month' | 'quarter' | 'year';

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true, enum: ['success', 'failed'] })
  status: 'success' | 'failed';

  @Prop({ required: false })
  errorMessage?: string;

  @Prop({ required: false, type: Object })
  reportData?: {
    reports: {
      total: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
      byPriority: Record<string, number>;
      resolved: number;
      pending: number;
      inProgress: number;
    };
    audits: {
      total: number;
      byStatus: Record<string, number>;
      completed: number;
      pending: number;
      overdue: number;
    };
    performance: {
      averageResolutionTime: number;
      averageProcessingTime: number;
      resolutionRate: number;
    };
  };

  @Prop({ required: false, default: false })
  isTest: boolean; // Đánh dấu là email test hay production
}

export const StatisticsReportLogSchema =
  SchemaFactory.createForClass(StatisticsReportLog);

// Index for faster queries
StatisticsReportLogSchema.index({ email: 1, createdAt: -1 });
StatisticsReportLogSchema.index({ period: 1, createdAt: -1 });
StatisticsReportLogSchema.index({ status: 1 });
