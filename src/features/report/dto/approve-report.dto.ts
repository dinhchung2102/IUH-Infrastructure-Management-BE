import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class ApproveReportDto {
  @IsNotEmpty({ message: 'Vui lòng cung cấp ID báo cáo' })
  @IsMongoId({ message: 'ID báo cáo không hợp lệ' })
  reportId: string;

  @IsNotEmpty({ message: 'Vui lòng chọn nhân viên xử lý' })
  @IsArray({ message: 'Danh sách nhân viên phải là mảng' })
  @IsMongoId({ each: true, message: 'ID nhân viên không hợp lệ' })
  staffIds: string[];

  @IsNotEmpty({ message: 'Vui lòng nhập tiêu đề công việc' })
  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray({ message: 'Danh sách hình ảnh phải là mảng' })
  @IsString({ each: true, message: 'URL hình ảnh phải là chuỗi' })
  images?: string[];
}
