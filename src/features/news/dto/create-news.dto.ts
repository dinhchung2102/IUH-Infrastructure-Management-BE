import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NewsStatus } from '../enum/NewsStatus.enum';

export class CreateNewsDto {
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString({ message: 'Tiêu đề phải là chuỗi' })
  @MinLength(5, { message: 'Tiêu đề phải có ít nhất 5 ký tự' })
  @MaxLength(200, { message: 'Tiêu đề không được quá 200 ký tự' })
  title: string;

  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  @IsString({ message: 'Mô tả phải là chuỗi' })
  @MinLength(10, { message: 'Mô tả phải có ít nhất 10 ký tự' })
  @MaxLength(500, { message: 'Mô tả không được quá 500 ký tự' })
  description: string;

  @IsNotEmpty({ message: 'Ảnh thumbnail không được để trống' })
  @IsString({ message: 'Ảnh thumbnail phải là chuỗi' })
  thumbnail: string;

  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  content: any;

  @IsOptional()
  @IsEnum(NewsStatus, { message: 'Trạng thái tin tức không hợp lệ' })
  status?: NewsStatus;

  @IsNotEmpty({ message: 'Tác giả không được để trống' })
  @IsString({ message: 'Tác giả phải là chuỗi' })
  author: string;

  @IsNotEmpty({ message: 'Danh mục không được để trống' })
  @IsString({ message: 'Danh mục phải là chuỗi' })
  category: string;
}
