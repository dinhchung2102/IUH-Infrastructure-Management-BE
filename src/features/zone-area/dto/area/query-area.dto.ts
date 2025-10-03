import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';
import { CommonStatus } from 'src/common/enum/CommonStatus.enum';
import { ZoneType } from '../../enum/ZoneType.enum';
import { Transform } from 'class-transformer';

export class QueryAreaDto {
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
  @IsString()
  campus?: string;

  @IsOptional()
  @IsEnum(ZoneType, { message: 'Loại khu vực không hợp lệ' })
  zoneType?: ZoneType;

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
