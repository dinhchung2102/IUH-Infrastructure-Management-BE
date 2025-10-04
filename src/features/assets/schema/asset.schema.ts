import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AssetType, type AssetTypeDocument } from './asset_type.schema';
import {
  AssetCategory,
  type AssetCategoryDocument,
} from './asset_category.schema';
import { AssetStatus } from '../enum/AssetStatus.enum';
import {
  Zone,
  type ZoneDocument,
} from 'src/features/zone-area/schema/zone.schema';
import {
  Area,
  type AreaDocument,
} from 'src/features/zone-area/schema/area.schema';
export type AssetDocument = Asset & Document;

@Schema({ timestamps: true })
export class Asset {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true, enum: AssetStatus })
  status: AssetStatus;

  @Prop({ required: true })
  description: string;

  @Prop()
  serialNumber?: string;

  @Prop()
  brand?: string;

  @Prop({ required: true, type: Types.ObjectId, ref: AssetType.name })
  assetType: AssetTypeDocument;

  @Prop({ required: true, type: Types.ObjectId, ref: AssetCategory.name })
  assetCategory: AssetCategoryDocument;

  @Prop()
  image: string;

  @Prop()
  warrantyEndDate?: Date;

  @Prop()
  lastMaintenanceDate?: Date;

  @Prop({ type: Types.ObjectId, ref: Zone.name })
  zone?: ZoneDocument;

  @Prop({ type: Types.ObjectId, ref: Area.name })
  area?: AreaDocument;
}

export const AssetSchema = SchemaFactory.createForClass(Asset);
