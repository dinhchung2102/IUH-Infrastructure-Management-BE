import { IsNumber, IsString } from 'class-validator';

export class OTPDto {
  @IsString()
  otp: string;

  @IsNumber()
  attempt: number;
}
