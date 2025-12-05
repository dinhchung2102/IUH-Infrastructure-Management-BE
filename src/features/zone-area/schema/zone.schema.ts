import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CommonStatus } from '../../../common/enum/CommonStatus.enum';
import type { BuildingDocument } from './building.schema';
import type { AreaDocument } from './area.schema';
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

  // Zone can belong to either Building OR Area (but not both)
  @Prop({ type: Types.ObjectId, ref: 'Building' })
  building?: BuildingDocument;

  @Prop({ type: Types.ObjectId, ref: 'Area' })
  area?: AreaDocument;

  @Prop({ required: true, enum: ZoneType })
  zoneType: ZoneType;

  // floorLocation only required when zone belongs to a building
  @Prop({ min: 1, max: 100 })
  floorLocation?: number;

  @Prop({ type: [Types.ObjectId], ref: 'Account' })
  accounts: Types.ObjectId[];
}

export const ZoneSchema = SchemaFactory.createForClass(Zone);

// Add validation: Zone must belong to either building OR area (but not both)
ZoneSchema.pre('save', function (next) {
  // Use get() method to safely access properties
  const building = this.get('building');
  const area = this.get('area');
  const floorLocation = this.get('floorLocation');

  // Check if both building and area are provided
  if (building && area) {
    return next(
      new Error(
        'Zone cannot belong to both building and area. Please choose one.',
      ),
    );
  }

  // Check if neither building nor area is provided
  if (!building && !area) {
    return next(new Error('Zone must belong to either a building or an area.'));
  }

  // If zone belongs to area, floorLocation should not be set
  if (area && floorLocation) {
    return next(new Error('Zone in area cannot have floorLocation.'));
  }

  // If zone belongs to building, floorLocation is required
  if (building && !floorLocation) {
    return next(new Error('Zone in building must have floorLocation.'));
  }

  next();
});
