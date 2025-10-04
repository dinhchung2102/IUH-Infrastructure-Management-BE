import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  Asset,
  type AssetDocument,
} from '../../../features/assets/schema/asset.schema';
import { AuditStatus } from '../enum/AuditStatus.enum';
import { type ReportDocument } from '../../../features/report/schema/report.schema';
import { Report } from '../../../features/report/schema/report.schema';
import {
  Account,
  type AccountDocument,
} from '../../../features/auth/schema/account.schema';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true, type: Types.ObjectId, ref: Asset.name })
  asset: AssetDocument;

  @Prop({ required: true })
  status: AuditStatus;

  @Prop({ required: false, type: Types.ObjectId, ref: Report.name })
  report?: ReportDocument;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, type: Types.ObjectId, ref: Account.name })
  staff: AccountDocument;

  @Prop({ required: true })
  images: string[];
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
