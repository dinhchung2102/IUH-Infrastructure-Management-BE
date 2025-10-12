import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum TimeSeriesType {
  DATE = 'date',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  CUSTOM = 'custom',
}

export class AccountStatsDto {
  @IsOptional()
  @IsEnum(TimeSeriesType, {
    message:
      'Type phải là một trong các giá trị: date, month, quarter, year, custom',
  })
  type?: TimeSeriesType;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'startDate phải có định dạng ISO 8601 (YYYY-MM-DD)' },
  )
  startDate?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'endDate phải có định dạng ISO 8601 (YYYY-MM-DD)' },
  )
  endDate?: string;
}
