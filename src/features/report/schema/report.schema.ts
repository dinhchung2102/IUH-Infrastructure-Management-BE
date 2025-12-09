import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  Asset,
  type AssetDocument,
} from '../../../features/assets/schema/asset.schema';
import { ReportType } from '../enum/ReportType.enum';
import { ReportStatus } from '../enum/ReportStatus.enum';
import { ReportPriority } from '../enum/ReportPriority.enum';
import {
  Account,
  type AccountDocument,
} from '../../../features/auth/schema/account.schema';

export type ReportDocument = Report & Document;

@Schema({ timestamps: true })
export class Report {
  @Prop({ required: true, type: Types.ObjectId, ref: Asset.name })
  asset: AssetDocument;

  @Prop({ required: true, enum: ReportType })
  type: ReportType;

  @Prop({ required: true, enum: ReportStatus })
  status: ReportStatus;

  @Prop({
    required: false,
    enum: ReportPriority,
    default: ReportPriority.MEDIUM,
  })
  priority?: ReportPriority;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  images: string[];

  @Prop({ required: true, type: Types.ObjectId, ref: Account.name })
  createdBy: AccountDocument;

  @Prop({ required: false, type: Number })
  suggestedProcessingDays?: number; // Số ngày xử lý gợi ý từ AI (từ lúc được phê duyệt)

  @Prop({ required: false })
  rejectReason?: string; // Lý do từ chối báo cáo

  @Prop({ required: false, type: Types.ObjectId, ref: Account.name })
  rejectedBy?: AccountDocument; // Người từ chối

  @Prop({ required: false, type: Date })
  rejectedAt?: Date; // Thời điểm từ chối
}

export const ReportSchema = SchemaFactory.createForClass(Report);
