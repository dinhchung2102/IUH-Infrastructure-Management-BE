import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { slugify } from 'transliteration';

export type NewsCategoryDocument = NewsCategory & Document;

@Schema({ timestamps: true })
export class NewsCategory {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: false })
  description: string;

  @Prop({ required: false })
  image: string;

  @Prop({ unique: true, trim: true, lowercase: true })
  slug: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const NewsCategorySchema = SchemaFactory.createForClass(NewsCategory);

NewsCategorySchema.pre('save', function (next) {
  const doc = this as NewsCategoryDocument;
  if (doc.isModified('name') || !doc.slug) {
    doc.slug = (slugify as unknown as (text: string, opts?: any) => string)(
      doc.name,
      { lowercase: true, separator: '-' },
    );
  }
  next();
});
