import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsArray,
  IsMongoId,
  MinLength,
  MaxLength,
} from 'class-validator';
import { MaintenanceStatus } from '../enum/MaintenanceStatus.enum';
import { MaintenancePriority } from '../enum/MaintenancePriority.enum';

export class CreateMaintenanceDto {
  @IsNotEmpty({ message: 'Thiết bị không được để trống' })
  @IsMongoId({ message: 'ID thiết bị không hợp lệ' })
  asset: string;

  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString({ message: 'Tiêu đề phải là chuỗi' })
  @MinLength(5, { message: 'Tiêu đề phải có ít nhất 5 ký tự' })
  @MaxLength(200, { message: 'Tiêu đề không được quá 200 ký tự' })
  title: string;

  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  @IsString({ message: 'Mô tả phải là chuỗi' })
  @MinLength(10, { message: 'Mô tả phải có ít nhất 10 ký tự' })
  @MaxLength(1000, { message: 'Mô tả không được quá 1000 ký tự' })
  description: string;

  @IsOptional()
  @IsEnum(MaintenanceStatus, { message: 'Trạng thái không hợp lệ' })
  status?: MaintenanceStatus;

  @IsOptional()
  @IsEnum(MaintenancePriority, { message: 'Độ ưu tiên không hợp lệ' })
  priority?: MaintenancePriority;

  @IsNotEmpty({ message: 'Ngày dự kiến bảo trì không được để trống' })
  @IsDateString({}, { message: 'Ngày dự kiến bảo trì không hợp lệ' })
  scheduledDate: string;

  @IsOptional()
  @IsArray({ message: 'Danh sách nhân viên phải là mảng' })
  @IsMongoId({ each: true, message: 'ID nhân viên không hợp lệ' })
  assignedTo?: string[];

  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi' })
  @MaxLength(500, { message: 'Ghi chú không được quá 500 ký tự' })
  notes?: string;

  @IsOptional()
  @IsArray({ message: 'Hình ảnh phải là mảng' })
  @IsString({ each: true, message: 'Mỗi URL hình ảnh phải là chuỗi' })
  images?: string[];
}
