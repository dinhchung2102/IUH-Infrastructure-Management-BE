import { IsArray, IsBoolean, IsNotEmpty, IsString } from 'class-validator';
import { Types } from 'mongoose';
import { Permission } from '../schema/permission.schema';

export class RoleDto {
  @IsNotEmpty()
  @IsString()
  roleName: string;

  @IsNotEmpty()
  @IsBoolean()
  isActive: boolean;

  @IsNotEmpty()
  @IsArray()
  permissions: Permission[];
}

export class CreateRoleDto {
  @IsNotEmpty()
  @IsString()
  roleName: string;

  @IsNotEmpty()
  @IsBoolean()
  isActive: boolean;

  @IsNotEmpty()
  @IsArray()
  permissions: Types.ObjectId[];
}
