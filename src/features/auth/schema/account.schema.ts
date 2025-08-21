import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Role, RoleDocument } from './role.schema';
import { Gender } from '../enum/gender.enum';
import { Types } from 'mongoose';
import { Exclude } from 'class-transformer';

export type AccountDocument = Account & Document;

@Schema({ timestamps: true })
export class Account {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  @Exclude()
  password: string;

  @Prop({ required: true, type: [Types.ObjectId], ref: Role.name })
  roles: RoleDocument[];

  @Prop({ required: true, unique: true })
  email: string;

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
}

export const AccountSchema = SchemaFactory.createForClass(Account);
