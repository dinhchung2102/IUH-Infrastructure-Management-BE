import {
  IsEnum,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { RoleName } from '../enum/role.enum';
import { Gender } from '../enum/gender.enum';

export class QueryAccountsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(RoleName, { message: 'Role không hợp lệ' })
  role?: RoleName;

  @IsOptional()
  @IsIn(['true', 'false'], {
    message: 'Trạng thái hoạt động phải là true hoặc false',
  })
  @Transform(({ value }): string | undefined => {
    if (value === 'true') return 'true';
    if (value === 'false') return 'false';
    return undefined;
  })
  isActive?: string;

  @IsOptional()
  @IsEnum(Gender, { message: 'Giới tính phải là MALE hoặc FEMALE' })
  gender?: Gender;

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
