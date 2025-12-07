import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum TimePeriod {
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class QueryStatisticsDto {
  @IsOptional()
  @IsEnum(TimePeriod, { message: 'Period phải là week, month hoặc year' })
  period?: TimePeriod;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

