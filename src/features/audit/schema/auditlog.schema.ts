import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
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
  @Prop({ required: true, type: Types.ObjectId, ref: Report.name })
  report: ReportDocument;

  @Prop({ required: true, default: AuditStatus.PENDING })
  status: AuditStatus;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: true, type: [Types.ObjectId], ref: Account.name })
  staffs: AccountDocument[];

  @Prop({ required: true })
  images: string[];
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
