import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Asset, type AssetDocument } from '../../assets/schema/asset.schema';
import {
  Account,
  type AccountDocument,
} from '../../auth/schema/account.schema';
import { MaintenanceStatus } from '../enum/MaintenanceStatus.enum';
import { MaintenancePriority } from '../enum/MaintenancePriority.enum';

export type MaintenanceDocument = Maintenance & Document;

@Schema({ timestamps: true })
export class Maintenance {
  @Prop({ required: true, type: Types.ObjectId, ref: Asset.name })
  asset: AssetDocument;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    required: true,
    enum: MaintenanceStatus,
    default: MaintenanceStatus.PENDING,
  })
  status: MaintenanceStatus;

  @Prop({
    required: true,
    enum: MaintenancePriority,
    default: MaintenancePriority.MEDIUM,
  })
  priority: MaintenancePriority;

  @Prop({ required: true })
  scheduledDate: Date;

  @Prop()
  completedDate?: Date;

  @Prop({ required: true, type: Types.ObjectId, ref: Account.name })
  createdBy: AccountDocument;

  @Prop({ type: [Types.ObjectId], ref: Account.name, default: [] })
  assignedTo: AccountDocument[];

  @Prop()
  notes?: string;

  @Prop({ type: [String], default: [] })
  images?: string[];
}

export const MaintenanceSchema = SchemaFactory.createForClass(Maintenance);

// Index for better query performance
MaintenanceSchema.index({ asset: 1, scheduledDate: 1 });
MaintenanceSchema.index({ status: 1, scheduledDate: 1 });
MaintenanceSchema.index({ assignedTo: 1 });
