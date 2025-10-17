import { IsArray, IsMongoId, IsNotEmpty } from 'class-validator';

export class AssignLocationDto {
  @IsNotEmpty({ message: 'Account ID không được để trống' })
  @IsMongoId({ message: 'Account ID không hợp lệ' })
  accountId: string;

  @IsNotEmpty({ message: 'Location IDs không được để trống' })
  @IsArray({ message: 'Location IDs phải là mảng' })
  @IsMongoId({ each: true, message: 'Mỗi Location ID phải hợp lệ' })
  locationIds: string[];
}

export class AssignCampusDto {
  @IsNotEmpty({ message: 'Account ID không được để trống' })
  @IsMongoId({ message: 'Account ID không hợp lệ' })
  accountId: string;

  @IsNotEmpty({ message: 'Campus ID không được để trống' })
  @IsMongoId({ message: 'Campus ID không hợp lệ' })
  campusId: string;
}

export class RemoveLocationDto {
  @IsNotEmpty({ message: 'Account ID không được để trống' })
  @IsMongoId({ message: 'Account ID không hợp lệ' })
  accountId: string;

  @IsNotEmpty({ message: 'Location ID không được để trống' })
  @IsMongoId({ message: 'Location ID không hợp lệ' })
  locationId: string;
}
