import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CommonStatus } from '../../../common/enum/CommonStatus.enum';
import { Building, type BuildingDocument } from './building.schema';
import { ZoneType } from '../enum/ZoneType.enum';

export type ZoneDocument = Zone & Document;

@Schema({ timestamps: true })
export class Zone {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: CommonStatus })
  status: CommonStatus;

  @Prop({ required: true, type: Types.ObjectId, ref: Building.name })
  building: BuildingDocument;

  @Prop({ required: true, enum: ZoneType })
  zoneType: ZoneType;

  @Prop({ required: true, min: 1, max: 100 })
  floorLocation: number;
}

export const ZoneSchema = SchemaFactory.createForClass(Zone);
