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

  @IsNotEmpty({ message: 'Tòa nhà không được để trống' })
  @IsMongoId({ message: 'ID tòa nhà không hợp lệ' })
  building: string;

  @IsNotEmpty({ message: 'Loại khu vực không được để trống' })
  @IsEnum(ZoneType, { message: 'Loại khu vực không hợp lệ' })
  zoneType: ZoneType;

  @IsNotEmpty({ message: 'Vị trí tầng không được để trống' })
  @IsNumber({}, { message: 'Vị trí tầng phải là số' })
  @Min(1, { message: 'Vị trí tầng phải lớn hơn 0' })
  @Max(100, { message: 'Vị trí tầng không được quá 100' })
  floorLocation: number;
}
