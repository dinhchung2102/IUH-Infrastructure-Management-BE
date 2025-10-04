import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  AssetCategory,
  type AssetCategoryDocument,
} from './asset_category.schema';
import { Types } from 'mongoose';
export type AssetTypeDocument = AssetType & Document;

@Schema({ timestamps: true })
export class AssetType {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, type: Types.ObjectId, ref: AssetCategory.name })
  assetCategory: AssetCategoryDocument;

  @Prop({ required: true })
  properties: Record<string, any>;
}

export const AssetTypeSchema = SchemaFactory.createForClass(AssetType);
