import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CancelAuditLogDto {
  @IsNotEmpty({ message: 'Lý do hủy bỏ không được để trống' })
  @IsString({ message: 'Lý do hủy bỏ phải là chuỗi' })
  @MinLength(5, { message: 'Lý do hủy bỏ phải có ít nhất 5 ký tự' })
  @MaxLength(500, { message: 'Lý do hủy bỏ không được quá 500 ký tự' })
  cancelReason: string;
}

