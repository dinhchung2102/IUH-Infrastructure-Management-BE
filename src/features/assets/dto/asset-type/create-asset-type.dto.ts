import {
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAssetTypeDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsNotEmpty()
  @IsMongoId()
  assetCategory: string;

  @IsNotEmpty()
  @IsObject()
  properties: Record<string, any>;
}
