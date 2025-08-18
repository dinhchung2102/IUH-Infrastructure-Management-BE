import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { RoleName } from '../enum/role.enum';
import { Action } from '../enum/action.enum';
import { Resource } from '../enum/resource.enum';

export type RoleDocument = Role & Document;

@Schema({ timestamps: true })
export class Role {
  @Prop({
    required: true,
    unique: true,
    enum: RoleName,
    default: RoleName.GUEST,
  })
  roleName: RoleName;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({
    required: true,
    default: true,
    enum: Action,
    type: [String],
  })
  actions: Action[];

  @Prop({
    required: true,
    default: true,
    enum: Resource,
    type: [String],
  })
  resources: Resource[];
}
export const RoleSchema = SchemaFactory.createForClass(Role);
