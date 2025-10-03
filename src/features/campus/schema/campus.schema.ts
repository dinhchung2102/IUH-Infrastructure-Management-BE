import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  Account,
  type AccountDocument,
} from 'src/features/auth/schema/account.schema';
import { Types } from 'mongoose';
import { CommonStatus } from 'src/common/enum/CommonStatus.enum';

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

  @Prop({ required: true, enum: CommonStatus })
  status: CommonStatus;

  @Prop({ required: true, type: Types.ObjectId, ref: Account.name })
  manager: AccountDocument;
}

export const CampusSchema = SchemaFactory.createForClass(Campus);
