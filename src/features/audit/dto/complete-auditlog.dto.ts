import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteAuditLogDto {
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi' })
  @MaxLength(1000, { message: 'Ghi chú không được quá 1000 ký tự' })
  notes?: string;
}
