import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CommonStatus } from '../../../common/enum/CommonStatus.enum';
import type { CampusDocument } from '../../../features/campus';
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

  @Prop({ required: true, type: Types.ObjectId, ref: 'Campus' })
  campus: CampusDocument;

  @Prop({ required: true, enum: ZoneType })
  zoneType: ZoneType;

  @Prop({ type: [Types.ObjectId], ref: 'Account' })
  accounts: Types.ObjectId[];
}

export const AreaSchema = SchemaFactory.createForClass(Area);
