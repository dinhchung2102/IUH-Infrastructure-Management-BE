import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsEnum,
  IsMongoId,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { CommonStatus } from 'src/common/enum/CommonStatus.enum';

export class CreateCampusDto {
  @IsNotEmpty({ message: 'Tên campus không được để trống' })
  @IsString({ message: 'Tên campus phải là chuỗi' })
  @MinLength(2, { message: 'Tên campus phải có ít nhất 2 ký tự' })
  @MaxLength(100, { message: 'Tên campus không được quá 100 ký tự' })
  name: string;

  @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
  @IsString({ message: 'Địa chỉ phải là chuỗi' })
  @MinLength(10, { message: 'Địa chỉ phải có ít nhất 10 ký tự' })
  @MaxLength(200, { message: 'Địa chỉ không được quá 200 ký tự' })
  address: string;

  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString({ message: 'Số điện thoại phải là chuỗi' })
  @Matches(/^[0-9+\-\s()]+$/, {
    message: 'Số điện thoại không hợp lệ',
  })
  @MaxLength(20, { message: 'Số điện thoại không được quá 20 ký tự' })
  phone: string;

  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(100, { message: 'Email không được quá 100 ký tự' })
  email: string;

  @IsNotEmpty({ message: 'Trạng thái campus không được để trống' })
  @IsEnum(CommonStatus, { message: 'Trạng thái campus không hợp lệ' })
  status: CommonStatus;

  @IsNotEmpty({ message: 'Quản lý campus không được để trống' })
  @IsMongoId({ message: 'ID quản lý không hợp lệ' })
  manager: string;
}
