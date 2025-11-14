import { IsString, IsOptional, MinLength } from 'class-validator';

export class ClassifyReportDto {
  @IsString()
  @MinLength(10, { message: 'Mô tả phải có ít nhất 10 ký tự' })
  description: string;

  @IsOptional()
  @IsString()
  location?: string;
}
