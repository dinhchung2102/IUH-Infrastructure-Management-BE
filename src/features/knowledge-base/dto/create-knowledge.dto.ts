import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';
import { KnowledgeType } from '../enum/KnowledgeType.enum';

export class CreateKnowledgeDto {
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString({ message: 'Tiêu đề phải là chuỗi' })
  @MinLength(5, { message: 'Tiêu đề phải có ít nhất 5 ký tự' })
  @MaxLength(200, { message: 'Tiêu đề không được quá 200 ký tự' })
  title: string;

  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  @IsString({ message: 'Nội dung phải là chuỗi' })
  @MinLength(20, { message: 'Nội dung phải có ít nhất 20 ký tự' })
  content: string;

  @IsNotEmpty({ message: 'Loại kiến thức không được để trống' })
  @IsEnum(KnowledgeType, { message: 'Loại kiến thức không hợp lệ' })
  type: KnowledgeType;

  @IsOptional()
  @IsString({ message: 'Danh mục phải là chuỗi' })
  category?: string;

  @IsOptional()
  @IsArray({ message: 'Tags phải là mảng' })
  @IsString({ each: true, message: 'Mỗi tag phải là chuỗi' })
  tags?: string[];

  @IsOptional()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsBoolean({ message: 'isActive phải là boolean' })
  isActive?: boolean;
}
