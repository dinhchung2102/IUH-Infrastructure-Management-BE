import {
  IsEnum,
  IsMongoId,
  IsNumberString,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ReportType } from '../enum/ReportType.enum';
import { ReportStatus } from '../enum/ReportStatus.enum';

export class QueryReportDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsMongoId()
  asset?: string;

  @IsOptional()
  @IsEnum(ReportType, { message: 'Loại báo cáo không hợp lệ' })
  type?: ReportType;

  @IsOptional()
  @IsEnum(ReportStatus, { message: 'Trạng thái báo cáo không hợp lệ' })
  status?: ReportStatus;

  @IsOptional()
  @IsMongoId()
  createdBy?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Từ ngày phải có định dạng ISO 8601 (YYYY-MM-DD)' },
  )
  fromDate?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Đến ngày phải có định dạng ISO 8601 (YYYY-MM-DD)' },
  )
  toDate?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'Số trang phải là số' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  page?: string = '1';

  @IsOptional()
  @IsNumberString({}, { message: 'Số lượng mỗi trang phải là số' })
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
