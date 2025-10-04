import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AssetStatus } from '../../enum/AssetStatus.enum';

export class CreateAssetDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code: string;

  @IsNotEmpty()
  @IsEnum(AssetStatus)
  status: AssetStatus;

  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  description: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsNotEmpty()
  @IsMongoId()
  assetType: string;

  @IsNotEmpty()
  @IsMongoId()
  assetCategory: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsDateString()
  warrantyEndDate?: string;

  @IsOptional()
  @IsDateString()
  lastMaintenanceDate?: string;

  @IsNotEmpty()
  @IsMongoId()
  zone: string;

  @IsNotEmpty()
  @IsMongoId()
  area: string;
}
