import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { RoleDocument } from './role.schema';
import { Role } from './role.schema';
import { Gender } from '../enum/gender.enum';
import { Types } from 'mongoose';

export type AccountDocument = Account & Document;

@Schema({ timestamps: true })
export class Account {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, type: Types.ObjectId, ref: Role.name })
  role: RoleDocument;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: false, unique: true, sparse: true })
  phoneNumber: string;

  @Prop({ required: false })
  address: string;

  @Prop({ required: false })
  avatar: string;

  @Prop({ required: false, enum: Gender })
  gender: Gender;

  @Prop({ required: false })
  dateOfBirth: Date;

  @Prop({ required: false })
  refreshToken: string;

  @Prop({ type: [Types.ObjectId], ref: 'Area', default: [] })
  areasManaged: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'Building', default: [] })
  buildingsManaged: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'Zone', default: [] })
  zonesManaged: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Campus', default: null })
  campusManaged: Types.ObjectId | null;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
