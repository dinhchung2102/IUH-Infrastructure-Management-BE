import { PartialType } from '@nestjs/mapped-types';
import { CreateNewsDto } from './create-news.dto';
import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateNewsDto extends PartialType(CreateNewsDto) {
  @IsOptional()
  @IsString({ message: 'Tiêu đề phải là chuỗi' })
  @MinLength(5, { message: 'Tiêu đề phải có ít nhất 5 ký tự' })
  @MaxLength(200, { message: 'Tiêu đề không được quá 200 ký tự' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  @MinLength(10, { message: 'Mô tả phải có ít nhất 10 ký tự' })
  @MaxLength(500, { message: 'Mô tả không được quá 500 ký tự' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Ảnh thumbnail phải là chuỗi' })
  thumbnail?: string;

  @IsOptional()
  content?: any;
}
