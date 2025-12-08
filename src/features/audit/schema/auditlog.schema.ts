import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AuditStatus } from '../enum/AuditStatus.enum';
import { type ReportDocument } from '../../../features/report/schema/report.schema';
import { Report } from '../../../features/report/schema/report.schema';
import {
  Asset,
  type AssetDocument,
} from '../../../features/assets/schema/asset.schema';
import {
  Account,
  type AccountDocument,
} from '../../../features/auth/schema/account.schema';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: false, type: Types.ObjectId, ref: Report.name })
  report?: ReportDocument;

  @Prop({ required: false, type: Types.ObjectId, ref: Asset.name })
  asset?: AssetDocument;

  @Prop({ required: true, default: AuditStatus.PENDING })
  status: AuditStatus;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: true, type: [Types.ObjectId], ref: Account.name })
  staffs: AccountDocument[];

  @Prop({ required: false, default: [] })
  images?: string[];

  @Prop({ required: false, type: Types.ObjectId, ref: Account.name })
  acceptedBy?: AccountDocument;

  @Prop({ required: false })
  acceptedAt?: Date;

  @Prop({ required: false, type: Types.ObjectId, ref: Account.name })
  completedBy?: AccountDocument;

  @Prop({ required: false })
  completedAt?: Date;

  @Prop({ required: false })
  notes?: string;

  @Prop({ required: false, type: Date })
  expiresAt?: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
