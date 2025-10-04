import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AuditStatus } from '../enum/AuditStatus.enum';

export class CreateAuditLogDto {
  @IsNotEmpty({ message: 'Asset không được để trống' })
  @IsMongoId({ message: 'ID asset không hợp lệ' })
  asset: string;

  @IsNotEmpty({ message: 'Trạng thái kiểm tra không được để trống' })
  @IsEnum(AuditStatus, { message: 'Trạng thái kiểm tra không hợp lệ' })
  status: AuditStatus;

  @IsOptional()
  @IsMongoId({ message: 'ID báo cáo không hợp lệ' })
  report?: string;

  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString({ message: 'Tiêu đề phải là chuỗi' })
  @MinLength(5, { message: 'Tiêu đề phải có ít nhất 5 ký tự' })
  @MaxLength(200, { message: 'Tiêu đề không được quá 200 ký tự' })
  subject: string;

  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  @IsString({ message: 'Mô tả phải là chuỗi' })
  @MinLength(10, { message: 'Mô tả phải có ít nhất 10 ký tự' })
  @MaxLength(1000, { message: 'Mô tả không được quá 1000 ký tự' })
  description: string;

  @IsNotEmpty({ message: 'Hình ảnh không được để trống' })
  @IsArray({ message: 'Hình ảnh phải là mảng' })
  @IsString({ each: true, message: 'Mỗi URL hình ảnh phải là chuỗi' })
  images: string[];

  @IsNotEmpty({ message: 'Nhân viên thực hiện không được để trống' })
  @IsMongoId({ message: 'ID nhân viên không hợp lệ' })
  staff: string;
}
