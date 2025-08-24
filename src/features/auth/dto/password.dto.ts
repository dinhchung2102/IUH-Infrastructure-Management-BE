import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  authOTP: string;

  @IsString()
  newPassword: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}
