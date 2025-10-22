import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateNewsCategoryDto {
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @IsString({ message: 'Tên danh mục phải là chuỗi' })
  @MinLength(2, { message: 'Tên danh mục phải có ít nhất 2 ký tự' })
  @MaxLength(100, { message: 'Tên danh mục không được quá 100 ký tự' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  @MaxLength(500, { message: 'Mô tả không được quá 500 ký tự' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Ảnh phải là chuỗi' })
  image?: string;

  @IsOptional()
  @IsBoolean({ message: 'Trạng thái phải là boolean' })
  isActive?: boolean;
}
