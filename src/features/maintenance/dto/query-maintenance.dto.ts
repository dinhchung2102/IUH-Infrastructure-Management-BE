import {
  IsOptional,
  IsEnum,
  IsString,
  IsMongoId,
  IsDateString,
} from 'class-validator';
import { MaintenanceStatus } from '../enum/MaintenanceStatus.enum';
import { MaintenancePriority } from '../enum/MaintenancePriority.enum';

export class QueryMaintenanceDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(MaintenanceStatus, { message: 'Trạng thái không hợp lệ' })
  status?: MaintenanceStatus;

  @IsOptional()
  @IsEnum(MaintenancePriority, { message: 'Độ ưu tiên không hợp lệ' })
  priority?: MaintenancePriority;

  @IsOptional()
  @IsMongoId({ message: 'ID thiết bị không hợp lệ' })
  asset?: string;

  @IsOptional()
  @IsMongoId({ message: 'ID nhân viên không hợp lệ' })
  assignedTo?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu không hợp lệ' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc không hợp lệ' })
  endDate?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
