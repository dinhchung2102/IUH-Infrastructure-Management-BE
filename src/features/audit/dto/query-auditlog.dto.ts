import {
  IsEnum,
  IsMongoId,
  IsNumberString,
  IsOptional,
  IsString,
  IsDateString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AuditStatus } from '../enum/AuditStatus.enum';

export class QueryAuditLogDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AuditStatus, { message: 'Trạng thái kiểm tra không hợp lệ' })
  status?: AuditStatus;

  @IsOptional()
  @IsMongoId()
  report?: string;

  @IsOptional()
  @IsMongoId()
  staff?: string;

  @IsOptional()
  @IsMongoId()
  zone?: string;

  @IsOptional()
  @IsMongoId()
  area?: string;

  @IsOptional()
  @IsMongoId()
  building?: string;

  @IsOptional()
  @IsMongoId()
  campus?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'Số trang phải là số' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  page?: string = '1';

  @IsOptional()
  @IsNumberString({}, { message: 'Số lượng mỗi trang phải là số' })
  @Type(() => Number)
  @Min(1, { message: 'Số lượng mỗi trang phải lớn hơn 0' })
  @Max(100, { message: 'Số lượng mỗi trang không được quá 100' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  limit?: string = '10';

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
