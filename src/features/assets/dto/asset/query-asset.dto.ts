import {
  IsEnum,
  IsMongoId,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { AssetStatus } from '../../enum/AssetStatus.enum';
import { Transform } from 'class-transformer';

export class QueryAssetDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  search?: string;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsMongoId()
  assetType?: string;

  @IsOptional()
  @IsMongoId()
  assetCategory?: string;

  @IsOptional()
  @IsMongoId()
  zone?: string;

  @IsOptional()
  @IsMongoId()
  area?: string;

  @IsOptional()
  @IsNumberString()
  page?: string = '1';

  @IsOptional()
  @IsNumberString()
  limit?: string = '10';

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
