import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class IndexedDocument extends Document {
  @Prop({ required: true })
  vectorId: string; // ID trong Qdrant

  @Prop({ required: true })
  sourceType: string; // 'report', 'asset', 'sop', 'faq', 'policy'

  @Prop({ required: true })
  sourceId: string; // MongoDB _id của document gốc

  @Prop({ required: true })
  content: string; // Text đã được indexed

  @Prop({ type: Object })
  metadata: {
    title?: string;
    url?: string;
    category?: string;
    tags?: string[];
    location?: string;
    lastModified?: Date;
  };

  @Prop({ type: Number, default: 768 })
  embeddingDimension: number;

  @Prop({ type: Date })
  lastSyncedAt: Date;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const IndexedDocumentSchema =
  SchemaFactory.createForClass(IndexedDocument);

// Indexes
IndexedDocumentSchema.index({ sourceType: 1, sourceId: 1 });
IndexedDocumentSchema.index({ vectorId: 1 }, { unique: true });
IndexedDocumentSchema.index({ isActive: 1, sourceType: 1 });
