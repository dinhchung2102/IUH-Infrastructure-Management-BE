import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryNewsCategoryDto {
  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi' })
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'Trạng thái phải là boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsString({ message: 'Trang phải là chuỗi số' })
  page?: string;

  @IsOptional()
  @IsString({ message: 'Giới hạn phải là chuỗi số' })
  limit?: string;

  @IsOptional()
  @IsString({ message: 'Trường sắp xếp phải là chuỗi' })
  sortBy?: string;

  @IsOptional()
  @IsString({ message: 'Thứ tự sắp xếp phải là chuỗi' })
  sortOrder?: 'asc' | 'desc';
}
