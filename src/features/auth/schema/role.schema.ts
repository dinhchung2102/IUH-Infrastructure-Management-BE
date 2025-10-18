import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Permission, PermissionDocument } from './permission.schema';

export type RoleDocument = Role & Document;

@Schema({ timestamps: true })
export class Role {
  @Prop({
    required: true,
    unique: true,
    type: String,
  })
  roleName: string;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({
    required: true,
    type: [Types.ObjectId],
    ref: Permission.name,
  })
  permissions: PermissionDocument[];
}
export const RoleSchema = SchemaFactory.createForClass(Role);
