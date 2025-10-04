import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CommonStatus } from '../../../common/enum/CommonStatus.enum';
export type AssetCategoryDocument = AssetCategory & Document;

@Schema({ timestamps: true })
export class AssetCategory {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, enum: CommonStatus })
  status: CommonStatus;

  @Prop({ required: true })
  description: string;

  @Prop()
  image: string;
}

export const AssetCategorySchema = SchemaFactory.createForClass(AssetCategory);
