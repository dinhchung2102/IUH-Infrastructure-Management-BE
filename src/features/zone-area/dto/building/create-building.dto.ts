import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsMongoId,
  IsNumber,
  MaxLength,
  MinLength,
  Min,
  Max,
} from 'class-validator';
import { CommonStatus } from '../../../../common/enum/CommonStatus.enum';

export class CreateBuildingDto {
  @IsNotEmpty({ message: 'Tên tòa nhà không được để trống' })
  @IsString({ message: 'Tên tòa nhà phải là chuỗi' })
  @MinLength(2, { message: 'Tên tòa nhà phải có ít nhất 2 ký tự' })
  @MaxLength(100, { message: 'Tên tòa nhà không được quá 100 ký tự' })
  name: string;

  @IsNotEmpty({ message: 'Số tầng không được để trống' })
  @IsNumber({}, { message: 'Số tầng phải là số' })
  @Min(1, { message: 'Số tầng phải lớn hơn 0' })
  @Max(100, { message: 'Số tầng không được quá 100' })
  floor: number;

  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  @IsEnum(CommonStatus, { message: 'Trạng thái không hợp lệ' })
  status: CommonStatus;

  @IsNotEmpty({ message: 'Campus không được để trống' })
  @IsMongoId({ message: 'ID campus không hợp lệ' })
  campus: string;
}
