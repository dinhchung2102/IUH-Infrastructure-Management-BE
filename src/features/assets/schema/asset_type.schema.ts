import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  AssetCategory,
  type AssetCategoryDocument,
} from './asset_category.schema';
import { Schema as MongooseSchema, Types } from 'mongoose';
export type AssetTypeDocument = AssetType & Document;

@Schema({ timestamps: true })
export class AssetType {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, type: Types.ObjectId, ref: AssetCategory.name })
  assetCategory: AssetCategoryDocument;

  @Prop({
    required: true,
    type: MongooseSchema.Types.Map,
    of: MongooseSchema.Types.Mixed,
  })
  properties: Map<string, any>;
}

export const AssetTypeSchema = SchemaFactory.createForClass(AssetType);
