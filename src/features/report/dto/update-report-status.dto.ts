import { IsEnum, IsNotEmpty } from 'class-validator';
import { ReportStatus } from '../enum/ReportStatus.enum';

export class UpdateReportStatusDto {
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  @IsEnum(ReportStatus, { message: 'Trạng thái không hợp lệ' })
  status: ReportStatus;
}

