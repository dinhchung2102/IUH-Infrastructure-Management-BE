import { PartialType } from '@nestjs/mapped-types';
import { CreateMaintenanceDto } from './create-maintenance.dto';
import { IsOptional, IsDateString } from 'class-validator';

export class UpdateMaintenanceDto extends PartialType(CreateMaintenanceDto) {
  @IsOptional()
  @IsDateString({}, { message: 'Ngày hoàn thành không hợp lệ' })
  completedDate?: string;
}
