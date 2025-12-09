import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { ReportStatus } from '../enum/ReportStatus.enum';

export class UpdateReportStatusDto {
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  @IsEnum(ReportStatus, { message: 'Trạng thái không hợp lệ' })
  status: ReportStatus;

  @IsOptional()
  @ValidateIf((o: UpdateReportStatusDto) => o.status === ReportStatus.REJECTED)
  @IsNotEmpty({ message: 'Lý do từ chối là bắt buộc khi từ chối báo cáo' })
  @IsString({ message: 'Lý do từ chối phải là chuỗi' })
  rejectReason?: string;
}
