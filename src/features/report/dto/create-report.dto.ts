import {
  IsArray,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ReportType } from '../enum/ReportType.enum';
import { ReportPriority } from '../enum/ReportPriority.enum';

export class CreateReportDto {
  @IsNotEmpty({ message: 'Asset không được để trống' })
  @IsMongoId({ message: 'ID asset không hợp lệ' })
  asset: string;

  @IsNotEmpty({ message: 'Loại báo cáo không được để trống' })
  @IsEnum(ReportType, { message: 'Loại báo cáo không hợp lệ' })
  type: ReportType;

  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  @IsString({ message: 'Mô tả phải là chuỗi' })
  @MinLength(10, { message: 'Mô tả phải có ít nhất 10 ký tự' })
  @MaxLength(1000, { message: 'Mô tả không được quá 1000 ký tự' })
  description: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'OTP phải là chuỗi' })
  authOTP?: string;

  @IsOptional()
  @IsEnum(ReportPriority, { message: 'Độ ưu tiên không hợp lệ' })
  priority?: ReportPriority;

  @IsOptional()
  @IsArray({ message: 'Hình ảnh phải là mảng' })
  @IsString({ each: true, message: 'Mỗi URL hình ảnh phải là chuỗi' })
  images?: string[];
}
