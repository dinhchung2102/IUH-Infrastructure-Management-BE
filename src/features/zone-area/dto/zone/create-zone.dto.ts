import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsMongoId,
  MaxLength,
  MinLength,
  IsNumber,
  Min,
  Max,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { CommonStatus } from '../../../../common/enum/CommonStatus.enum';
import { ZoneType } from '../../enum/ZoneType.enum';

export class CreateZoneDto {
  @IsNotEmpty({ message: 'Tên khu vực không được để trống' })
  @IsString({ message: 'Tên khu vực phải là chuỗi' })
  @MinLength(2, { message: 'Tên khu vực phải có ít nhất 2 ký tự' })
  @MaxLength(100, { message: 'Tên khu vực không được quá 100 ký tự' })
  name: string;

  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  @IsString({ message: 'Mô tả phải là chuỗi' })
  @MinLength(10, { message: 'Mô tả phải có ít nhất 10 ký tự' })
  @MaxLength(500, { message: 'Mô tả không được quá 500 ký tự' })
  description: string;

  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  @IsEnum(CommonStatus, { message: 'Trạng thái không hợp lệ' })
  status: CommonStatus;

  // Zone can belong to either building OR area (but not both)
  @IsOptional()
  @IsMongoId({ message: 'ID tòa nhà không hợp lệ' })
  @ValidateIf((o) => !o.area, { message: 'Phải có tòa nhà hoặc khu vực ngoài trời' })
  building?: string;

  @IsOptional()
  @IsMongoId({ message: 'ID khu vực ngoài trời không hợp lệ' })
  @ValidateIf((o) => !o.building, { message: 'Phải có tòa nhà hoặc khu vực ngoài trời' })
  area?: string;

  @IsNotEmpty({ message: 'Loại khu vực không được để trống' })
  @IsEnum(ZoneType, { message: 'Loại khu vực không hợp lệ' })
  zoneType: ZoneType;

  // floorLocation only required when zone belongs to a building
  @IsOptional()
  @IsNumber({}, { message: 'Vị trí tầng phải là số' })
  @Min(1, { message: 'Vị trí tầng phải lớn hơn 0' })
  @Max(100, { message: 'Vị trí tầng không được quá 100' })
  @ValidateIf((o) => !!o.building, { message: 'Vị trí tầng bắt buộc khi zone thuộc tòa nhà' })
  floorLocation?: number;
}
