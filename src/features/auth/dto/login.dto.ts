import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsOptional()
  @IsBoolean()
  rememberMe: boolean;

  @IsNotEmpty()
  @IsString()
  password: string;
}
