import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CommonStatus } from '../../../../common/enum/CommonStatus.enum';

export class CreateAssetCategoryDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsNotEmpty()
  @IsEnum(CommonStatus)
  status: CommonStatus;

  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  description: string;

  @IsOptional()
  @IsString()
  image?: string;
}
