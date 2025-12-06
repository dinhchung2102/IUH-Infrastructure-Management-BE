import {
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumberString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { KnowledgeType } from '../enum/KnowledgeType.enum';

export class QueryKnowledgeDto {
  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi' })
  search?: string;

  @IsOptional()
  @IsEnum(KnowledgeType, { message: 'Loại kiến thức không hợp lệ' })
  type?: KnowledgeType;

  @IsOptional()
  @IsString({ message: 'Danh mục phải là chuỗi' })
  category?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'isActive phải là boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsNumberString({}, { message: 'Số trang phải là số' })
  page?: string = '1';

  @IsOptional()
  @IsNumberString({}, { message: 'Số lượng mỗi trang phải là số' })
  limit?: string = '10';

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

