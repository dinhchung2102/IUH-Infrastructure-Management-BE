import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RoleName } from '../enum/role.enum';

export class CreateStaffAccountDto {
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @IsString({ message: 'Họ tên phải là chuỗi' })
  @MinLength(2, { message: 'Họ tên phải có ít nhất 2 ký tự' })
  @MaxLength(100, { message: 'Họ tên không được quá 100 ký tự' })
  fullName: string;

  @IsNotEmpty({ message: 'Role không được để trống' })
  @IsEnum(
    {
      ADMIN: RoleName.ADMIN,
      STAFF: RoleName.STAFF,
      CAMPUS_ADMIN: RoleName.CAMPUS_ADMIN,
    },
    { message: 'Role phải là ADMIN, STAFF hoặc CAMPUS_ADMIN' },
  )
  role: RoleName.ADMIN | RoleName.STAFF | RoleName.CAMPUS_ADMIN;

  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi' })
  phoneNumber?: string;

  @IsOptional()
  @IsString({ message: 'Địa chỉ phải là chuỗi' })
  address?: string;

  @IsOptional()
  @IsString({ message: 'Giới tính phải là chuỗi' })
  gender?: string;

  @IsOptional()
  @IsString({ message: 'Avatar phải là chuỗi' })
  avatar?: string;
}
