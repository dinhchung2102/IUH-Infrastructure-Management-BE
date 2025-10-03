import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CampusStatus } from '../enum/Campus.enum';
import {
  Account,
  type AccountDocument,
} from 'src/features/auth/schema/account.schema';
import { Types } from 'mongoose';

export type CampusDocument = Campus & Document;

@Schema({ timestamps: true })
export class Campus {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, enum: CampusStatus })
  status: CampusStatus;

  @Prop({ required: true, type: Types.ObjectId, ref: Account.name })
  manager: AccountDocument;
}

export const CampusSchema = SchemaFactory.createForClass(Campus);
