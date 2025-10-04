import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { RoleName } from '../enum/role.enum';

export class QueryAccountsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(RoleName, { message: 'Role không hợp lệ' })
  role?: RoleName;

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
