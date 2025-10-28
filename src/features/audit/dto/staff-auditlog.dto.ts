import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsDateString,
  Max,
  Min,
  IsIn,
  IsNumber,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum TimeRange {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class StaffAuditLogDto {
  @IsOptional()
  @IsEnum(TimeRange, { message: 'Loại thời gian không hợp lệ' })
  timeRange?: TimeRange = TimeRange.DAY;

  // For day: specific date (YYYY-MM-DD)
  @IsOptional()
  @IsDateString()
  date?: string;

  // For week: week number (1-53) and year
  @IsOptional()
  @Transform(({ value }): number | string => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return isNaN(num) ? value : num;
    }
    return value;
  })
  @IsNumber({}, { message: 'Số tuần phải là số' })
  @Min(1, { message: 'Số tuần phải từ 1 đến 53' })
  @Max(53, { message: 'Số tuần phải từ 1 đến 53' })
  week?: number;

  @IsOptional()
  @Transform(({ value }): number | string => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return isNaN(num) ? value : num;
    }
    return value;
  })
  @IsNumber({}, { message: 'Năm phải là số' })
  @Min(2000, { message: 'Năm phải từ 2000 trở lên' })
  @Max(2100, { message: 'Năm phải từ 2100 trở xuống' })
  year?: number;

  // For month: month number (1-12) and year
  @IsOptional()
  @Transform(({ value }): number | string => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return isNaN(num) ? value : num;
    }
    return value;
  })
  @IsNumber({}, { message: 'Số tháng phải là số' })
  @Min(1, { message: 'Số tháng phải từ 1 đến 12' })
  @Max(12, { message: 'Số tháng phải từ 1 đến 12' })
  month?: number;

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
  @IsIn(['asc', 'desc'], { message: 'Thứ tự sắp xếp phải là asc hoặc desc' })
  sortOrder?: 'asc' | 'desc' = 'desc';
}
