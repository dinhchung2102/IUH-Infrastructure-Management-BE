import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Action } from '../enum/action.enum';
import { Resource } from '../enum/resource.enum';

export type PermissionDocument = Permission & Document;

@Schema({ timestamps: true })
export class Permission {
  @Prop({
    required: true,
    enum: Resource,
    type: String,
  })
  resource: Resource;

  @Prop({
    required: true,
    enum: Action,
    type: String,
  })
  action: Action;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
