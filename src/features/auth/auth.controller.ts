import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Put,
  Res,
  Req,
  Query,
  Param,
  Patch,
} from '@nestjs/common';
import type { Request, Response } from 'express';
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
import { UnauthorizedException } from '@nestjs/common';
import { QueryAccountsDto } from './dto/query-accounts.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Parse time string (e.g., '7d', '30d', '1h') to milliseconds
   */
  private parseTimeToMs(timeString: string): number {
    const match = timeString.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000; // default 7 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers = {
      s: 1000, // seconds
      m: 60 * 1000, // minutes
      h: 60 * 60 * 1000, // hours
      d: 24 * 60 * 60 * 1000, // days
    };

    return value * multipliers[unit];
  }

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
  @Post('send-register-otp')
  @HttpCode(HttpStatus.OK)
  async sendRegisterOTP(@Body() dto: SendOtpDto) {
    return this.authService.sendRegisterOTP(dto);
  }

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);

    // Get refresh token expiry time from config based on rememberMe
    const defaultExpiry = loginDto.rememberMe ? '30d' : '1d';
    const refreshTokenExpiry = this.configService.get<string>(
      'JWT_REFRESH_TOKEN_EXPIRES_IN',
      defaultExpiry,
    );
    const maxAge = this.parseTimeToMs(refreshTokenExpiry);

    response.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refresh_token, ...responseWithoutRefreshToken } = result;
    return responseWithoutRefreshToken;
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub);
  }

  @UseGuards(AuthGuard)
  @Get('check-permission')
  getMyInfo(@CurrentUser() user: JwtPayload) {
    return {
      message: 'Thông tin user từ JWT',
      role: user.role,
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

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookieHeader = request.headers.cookie;
    const refreshToken = cookieHeader
      ?.split(';')
      .find((cookie) => cookie.trim().startsWith('refresh_token='))
      ?.split('=')[1];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token không được tìm thấy');
    }

    const result = await this.authService.refreshToken({ refreshToken });

    // Get refresh token expiry time from config
    const refreshTokenExpiry = this.configService.get<string>(
      'JWT_REFRESH_TOKEN_EXPIRES_IN',
      '7d',
    );
    const maxAge = this.parseTimeToMs(refreshTokenExpiry);

    response.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refresh_token, ...responseWithoutRefreshToken } = result;
    return responseWithoutRefreshToken;
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Clear refresh token cookie
    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return this.authService.logout(user.sub);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ACCOUNT:ADMINACTION')
  @Get('accounts')
  async findAllAccounts(@Query() queryDto: QueryAccountsDto) {
    return this.authService.findAllAccounts(queryDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ACCOUNT:ADMINACTION')
  @Get('accounts/:id')
  async getAccountById(@Param('id') id: string) {
    return this.authService.getAccountById(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ACCOUNT:ADMINACTION')
  @Patch('accounts/:id')
  @HttpCode(HttpStatus.OK)
  async updateAccount(
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    return this.authService.updateAccount(id, updateAccountDto);
  }
}
