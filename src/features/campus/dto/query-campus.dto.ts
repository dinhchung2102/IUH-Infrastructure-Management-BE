import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';
import { CommonStatus } from '../../../common/enum/CommonStatus.enum';
import { Transform } from 'class-transformer';

export class QueryCampusDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  search?: string;

  @IsOptional()
  @IsEnum(CommonStatus, { message: 'Trạng thái campus không hợp lệ' })
  status?: CommonStatus;

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
