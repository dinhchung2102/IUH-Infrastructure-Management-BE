import { IsOptional, IsEnum, IsString } from 'class-validator';
import { NewsStatus } from '../enum/NewsStatus.enum';

export class QueryNewsDto {
  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi' })
  search?: string;

  @IsOptional()
  @IsEnum(NewsStatus, { message: 'Trạng thái tin tức không hợp lệ' })
  status?: NewsStatus;

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

  @IsOptional()
  @IsString({ message: 'ID tác giả phải là chuỗi' })
  author?: string;
}
