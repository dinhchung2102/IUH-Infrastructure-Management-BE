import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CommonStatus } from '../../../common/enum/CommonStatus.enum';
import { Campus, type CampusDocument } from '../../../features/campus';

export type BuildingDocument = Building & Document;

@Schema({ timestamps: true })
export class Building {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  floor: number;

  @Prop({ required: true, enum: CommonStatus })
  status: CommonStatus;

  @Prop({ required: true, type: Types.ObjectId, ref: Campus.name })
  campus: CampusDocument;
}

export const BuildingSchema = SchemaFactory.createForClass(Building);
