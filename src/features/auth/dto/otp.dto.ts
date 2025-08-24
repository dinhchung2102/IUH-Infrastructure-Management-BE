import { IsEmail, IsString } from 'class-validator';

export class SendOtpDto {
  @IsEmail()
  email: string;
}

export class VerifyOTPDto {
  @IsEmail()
  email: string;

  @IsString()
  authOTP: string;
}
