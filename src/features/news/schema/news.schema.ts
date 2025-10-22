import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';
import { slugify } from 'transliteration';
import { NewsStatus } from '../enum/NewsStatus.enum';
import { NewsCategory, type NewsCategoryDocument } from './newsCategory.schema';

@Schema({ timestamps: true })
export class News extends Document {
  @Prop({ required: true, unique: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  thumbnail: string;

  @Prop({ unique: true, trim: true })
  slug: string;

  @Prop({ required: true })
  author: string;

  @Prop({ default: NewsStatus.DRAFT, enum: NewsStatus })
  status: NewsStatus;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  content: any;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: NewsCategory.name })
  category: NewsCategoryDocument;
}

export const NewsSchema = SchemaFactory.createForClass(News);

NewsSchema.pre('save', function (next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = (slugify as unknown as (text: string, opts?: any) => string)(
      this.title,
      { lowercase: true, separator: '-' },
    );
  }
  next();
});
