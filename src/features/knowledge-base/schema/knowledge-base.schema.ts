import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { KnowledgeType } from '../enum/KnowledgeType.enum';

export type KnowledgeBaseDocument = KnowledgeBase & Document;

@Schema({ timestamps: true })
export class KnowledgeBase {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, enum: KnowledgeType })
  type: KnowledgeType;

  @Prop({ required: false })
  category?: string;

  @Prop({ required: false })
  tags?: string[];

  @Prop({ required: false, type: Object })
  metadata?: Record<string, any>;

  @Prop({ required: true, default: true })
  isActive: boolean;
}

export const KnowledgeBaseSchema = SchemaFactory.createForClass(KnowledgeBase);
