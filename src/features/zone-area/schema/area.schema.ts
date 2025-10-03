import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CommonStatus } from 'src/common/enum/CommonStatus.enum';
import { Campus, type CampusDocument } from 'src/features/campus';
import { ZoneType } from '../enum/ZoneType.enum';
export type AreaDocument = Area & Document;

@Schema({ timestamps: true })
export class Area {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, enum: CommonStatus })
  status: CommonStatus;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, type: Types.ObjectId, ref: Campus.name })
  campus: CampusDocument;

  @Prop({ required: true, enum: ZoneType })
  zoneType: ZoneType;
}

export const AreaSchema = SchemaFactory.createForClass(Area);
