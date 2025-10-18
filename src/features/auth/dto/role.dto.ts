import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Types } from 'mongoose';
import { Permission } from '../schema/permission.schema';

export class RoleDto {
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  _id: string;

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

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  roleName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  permissions?: string[];
}
