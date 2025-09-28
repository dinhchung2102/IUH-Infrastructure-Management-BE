import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsDateString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Gender } from '../enum/gender.enum';
import { AUTH_CONFIG } from '../config/auth.config';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(AUTH_CONFIG.USERNAME_MIN_LENGTH)
  @MaxLength(AUTH_CONFIG.USERNAME_MAX_LENGTH)
  // @Matches(/^[a-zA-Z0-9_]+$/, {
  //   message: 'Username chỉ được chứa chữ cái, số và dấu gạch dưới',
  // })
  username: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(AUTH_CONFIG.PASSWORD_MIN_LENGTH)
  @MaxLength(AUTH_CONFIG.PASSWORD_MAX_LENGTH)
  // @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
  //   message:
  //     'Password phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt',
  // })
  password: string;

  @IsNotEmpty()
  @IsEmail()
  @MaxLength(AUTH_CONFIG.EMAIL_MAX_LENGTH)
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(AUTH_CONFIG.FULLNAME_MIN_LENGTH)
  @MaxLength(AUTH_CONFIG.FULLNAME_MAX_LENGTH)
  fullName: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]+$/, {
    message: 'Số điện thoại không hợp lệ',
  })
  @MaxLength(AUTH_CONFIG.PHONE_MAX_LENGTH)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(AUTH_CONFIG.ADDRESS_MAX_LENGTH)
  address?: string;

  @IsOptional()
  @IsEnum(Gender, { message: 'Gender phải là MALE hoặc FEMALE' })
  gender?: Gender;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsNotEmpty()
  @IsString()
  authOTP: string;
}
