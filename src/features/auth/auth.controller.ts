import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { PermissionDto } from './dto/permission.dto';
import { CreateRoleDto } from './dto/role.dto';
import { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { RequirePermissions } from './decorators';
import { SendOtpDto, VerifyOTPDto } from './dto/otp.dto';
import { ChangePasswordDto, ResetPasswordDto } from './dto/password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('PERMISSION:CREATE')
  @Post('create-permission')
  async createPermission(@Body() permissionDto: PermissionDto) {
    return this.authService.createPermission(permissionDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ROLE:CREATE')
  @Post('create-role')
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.authService.createRole(createRoleDto);
  }

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return {
      message: 'Thông tin profile',
      user,
    };
  }

  @UseGuards(AuthGuard)
  @Get('check-permission')
  getMyInfo(@CurrentUser() user: JwtPayload) {
    return {
      message: 'Thông tin user từ JWT',
      roles: user.roles,
      permissions: user.permissions,
    };
  }

  @Post('send-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  async sendEmailOTP(@Body() dto: SendOtpDto) {
    return this.authService.sendEmailOTP(dto);
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendEmailOTP(@Body() dto: SendOtpDto) {
    return this.authService.resendEmailOTP(dto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyEmailOTP(@Body() dto: VerifyOTPDto) {
    return this.authService.verifyEmailOTP(dto);
  }

  @Public()
  @Post('request-reset-password')
  @HttpCode(HttpStatus.OK)
  async requestResetPassword(@Body() dto: SendOtpDto) {
    return this.authService.requestResetPassword(dto);
  }

  @Public()
  @Put('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(AuthGuard)
  @Put('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.authService.changePassword(user.sub, dto.newPassword);
  }
}
