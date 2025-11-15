import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumberString,
  IsNumber,
} from 'class-validator';
import { CommonStatus } from '../../../../common/enum/CommonStatus.enum';
import { ZoneType } from '../../enum/ZoneType.enum';
import { Transform } from 'class-transformer';

export class QueryZoneDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  search?: string;

  @IsOptional()
  @IsEnum(CommonStatus, { message: 'Trạng thái không hợp lệ' })
  status?: CommonStatus;

  @IsOptional()
  @IsEnum(ZoneType, { message: 'Loại khu vực không hợp lệ' })
  zoneType?: ZoneType;

  @IsOptional()
  @IsString()
  building?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  campus?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Tầng phải là số' })
  floorLocation?: number;

  @IsOptional()
  @IsNumberString({}, { message: 'Trang phải là số' })
  page?: string = '1';

  @IsOptional()
  @IsNumberString({}, { message: 'Số lượng phải là số' })
  limit?: string = '10';

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
