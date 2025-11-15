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
  Delete,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { PermissionDto } from './dto/permission.dto';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { RequirePermissions } from './decorators';
import { SendOtpDto, VerifyOTPDto } from './dto/otp.dto';
import { ChangePasswordDto, ResetPasswordDto } from './dto/password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UnauthorizedException } from '@nestjs/common';
import { QueryAccountsDto } from './dto/query-accounts.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountStatsDto } from './dto/account-stats.dto';
import { CreateStaffAccountDto } from './dto/create-staff-account.dto';
import {
  AssignLocationDto,
  AssignCampusDto,
  RemoveLocationDto,
} from './dto/assign-location.dto';
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

  /**
   * Get cookie options based on environment
   */
  private getCookieOptions(maxAge?: number): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge?: number;
  } {
    const isProduction = process.env.NODE_ENV === 'production';
    // Allow override via COOKIE_SECURE env variable for testing
    const forceSecure = process.env.COOKIE_SECURE === 'true';
    const forceInsecure = process.env.COOKIE_SECURE === 'false';

    let secure: boolean;
    if (forceSecure) {
      secure = true;
    } else if (forceInsecure) {
      secure = false;
    } else {
      secure = isProduction;
    }

    return {
      httpOnly: true,
      secure,
      sameSite: isProduction ? 'none' : 'lax',
      ...(maxAge && { maxAge }),
    };
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['PERMISSION:CREATE'])
  @Post('create-permission')
  async createPermission(@Body() permissionDto: PermissionDto) {
    return this.authService.createPermission(permissionDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['PERMISSION:READ'])
  @Get('permissions')
  async getAllPermissions(): Promise<{
    message: string;
    permissions: any[];
    total: number;
  }> {
    return await this.authService.getAllPermissions();
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ROLE:CREATE'])
  @Post('create-role')
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.authService.createRole(createRoleDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ROLE:READ'])
  @Get('roles')
  async getAllRoles(): Promise<{
    message: string;
    roles: any[];
    total: number;
  }> {
    return await this.authService.getAllRoles();
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ROLE:UPDATE'])
  @Patch('roles/:id')
  @HttpCode(HttpStatus.OK)
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<{
    message: string;
    role: any;
  }> {
    return await this.authService.updateRole(id, updateRoleDto as any);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ROLE:DELETE'])
  @Delete('roles/:id')
  @HttpCode(HttpStatus.OK)
  async deleteRole(@Param('id') id: string): Promise<{
    message: string;
  }> {
    return await this.authService.deleteRole(id);
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
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);

    // Detect client type
    const ua = req.headers['user-agent'] || '';
    const origin = req.headers['origin'];
    const isMobile =
      !origin &&
      (ua.includes('okhttp') ||
        ua.includes('ReactNative') ||
        ua.includes('Expo'));

    if (isMobile) {
      // Return JSON for mobile with both tokens
      return {
        message: 'Đăng nhập thành công',
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        account: result.account,
      };
    }

    // Web client - set refresh token in httpOnly cookie
    const refreshTokenExpiry = loginDto.rememberMe
      ? this.configService.get<string>('JWT_REMEMBER', '30d')
      : this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRES_IN', '1d');
    const maxAge = this.parseTimeToMs(refreshTokenExpiry);

    response.cookie(
      'refresh_token',
      result.refresh_token,
      this.getCookieOptions(maxAge),
    );

    // Return only access token for web
    return {
      message: 'Đăng nhập thành công',
      access_token: result.access_token,
      account: result.account,
    };
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
    return this.authService.changePassword(
      user.sub,
      dto.oldPassword,
      dto.newPassword,
    );
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Detect client type
    const ua = request.headers['user-agent'] || '';
    const origin = request.headers['origin'];
    const isMobile =
      !origin &&
      (ua.includes('okhttp') ||
        ua.includes('ReactNative') ||
        ua.includes('Expo'));

    let refreshToken: string;

    if (isMobile) {
      // For mobile, get refresh token from request body
      const body = request.body as RefreshTokenDto;
      if (!body?.refreshToken) {
        throw new UnauthorizedException('Refresh token không được tìm thấy');
      }
      refreshToken = body.refreshToken;
    } else {
      // For web, get refresh token from cookie
      const cookieHeader = request.headers.cookie;
      const extractedToken = cookieHeader
        ?.split(';')
        .find((cookie) => cookie.trim().startsWith('refresh_token='))
        ?.split('=')[1];

      if (!extractedToken) {
        throw new UnauthorizedException('Refresh token không được tìm thấy');
      }
      refreshToken = extractedToken;
    }

    const result = await this.authService.refreshToken({ refreshToken });

    if (isMobile) {
      // Return JSON for mobile with both tokens
      return {
        message: 'Refresh token thành công',
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      };
    }

    // Web client - set refresh token in httpOnly cookie
    const maxAge = this.parseTimeToMs(result.refreshTokenExpiry);

    response.cookie(
      'refresh_token',
      result.refresh_token,
      this.getCookieOptions(maxAge),
    );

    // Return only access token for web
    return {
      message: 'Refresh token thành công',
      access_token: result.access_token,
    };
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Detect client type
    const ua = request.headers['user-agent'] || '';
    const origin = request.headers['origin'];
    const isMobile =
      !origin &&
      (ua.includes('okhttp') ||
        ua.includes('ReactNative') ||
        ua.includes('Expo'));

    // Clear refresh token cookie for web clients
    if (!isMobile) {
      response.clearCookie('refresh_token', this.getCookieOptions());
    }

    return this.authService.logout(user.sub);
  }

  //================= Account Management =================//=======================
  /**
   * 
   Account Management APIs => Only Admin can access--------------------------------
   */
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION', 'ACCOUNT:ALL'], 'OR')
  @Get('accounts/stats')
  async getAccountStats(@Query() statsDto: AccountStatsDto) {
    return this.authService.getAccountStats(statsDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION', 'ACCOUNT:ALL'], 'OR')
  @Post('accounts/staff-only')
  @UseInterceptors(AnyFilesInterceptor())
  @HttpCode(HttpStatus.CREATED)
  async createStaffAccount(
    @Body() createStaffAccountDto: CreateStaffAccountDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return await this.authService.createStaffAccount(
      createStaffAccountDto,
      files,
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION'])
  @Get('accounts')
  async findAllAccounts(@Query() queryDto: QueryAccountsDto) {
    return this.authService.findAllAccounts(queryDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION'])
  @Get('accounts/staff-only')
  async findStaffAccounts(@Query() queryDto: QueryAccountsDto) {
    return this.authService.findStaffAccounts(queryDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION'])
  @Get('accounts/staff-only/stats')
  async getStaffStats() {
    return this.authService.getStaffStats();
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION'])
  @Get('accounts/:id')
  async getAccountById(@Param('id') id: string) {
    return this.authService.getAccountById(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION'])
  @Patch('accounts/:id')
  @HttpCode(HttpStatus.OK)
  async updateAccount(
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    return this.authService.updateAccount(id, updateAccountDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION'])
  @Patch('accounts/:id/lock')
  @HttpCode(HttpStatus.OK)
  async lockAccount(@Param('id') id: string) {
    return await this.authService.lockAccount(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION'])
  @Patch('accounts/:id/unlock')
  @HttpCode(HttpStatus.OK)
  async unlockAccount(@Param('id') id: string) {
    return await this.authService.unlockAccount(id);
  }

  //================= Location Assignment =================//

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION'])
  @Post('accounts/assign-zones')
  @HttpCode(HttpStatus.OK)
  async assignZonesToAccount(@Body() dto: AssignLocationDto) {
    return this.authService.assignZonesToAccount(
      dto.accountId,
      dto.locationIds,
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION'])
  @Post('accounts/assign-buildings')
  @HttpCode(HttpStatus.OK)
  async assignBuildingsToAccount(@Body() dto: AssignLocationDto) {
    return this.authService.assignBuildingsToAccount(
      dto.accountId,
      dto.locationIds,
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION'])
  @Post('accounts/assign-areas')
  @HttpCode(HttpStatus.OK)
  async assignAreasToAccount(@Body() dto: AssignLocationDto) {
    return this.authService.assignAreasToAccount(
      dto.accountId,
      dto.locationIds,
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION'])
  @Post('accounts/assign-campus')
  @HttpCode(HttpStatus.OK)
  async assignCampusToAccount(@Body() dto: AssignCampusDto) {
    return this.authService.assignCampusToAccount(dto.accountId, dto.campusId);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION'])
  @Delete('accounts/remove-zone')
  @HttpCode(HttpStatus.OK)
  async removeZoneFromAccount(@Body() dto: RemoveLocationDto) {
    return this.authService.removeZoneFromAccount(
      dto.accountId,
      dto.locationId,
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION'])
  @Delete('accounts/remove-building')
  @HttpCode(HttpStatus.OK)
  async removeBuildingFromAccount(@Body() dto: RemoveLocationDto) {
    return this.authService.removeBuildingFromAccount(
      dto.accountId,
      dto.locationId,
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION'])
  @Delete('accounts/remove-area')
  @HttpCode(HttpStatus.OK)
  async removeAreaFromAccount(@Body() dto: RemoveLocationDto) {
    return this.authService.removeAreaFromAccount(
      dto.accountId,
      dto.locationId,
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION'])
  @Delete('accounts/:accountId/remove-campus')
  @HttpCode(HttpStatus.OK)
  async removeCampusFromAccount(@Param('accountId') accountId: string) {
    return this.authService.removeCampusFromAccount(accountId);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION'])
  @Get('accounts/by-zone/:zoneId')
  async getAccountsByZone(@Param('zoneId') zoneId: string) {
    return this.authService.getAccountsByZone(zoneId);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION'])
  @Get('accounts/by-building/:buildingId')
  async getAccountsByBuilding(@Param('buildingId') buildingId: string) {
    return this.authService.getAccountsByBuilding(buildingId);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION'])
  @Get('accounts/by-area/:areaId')
  async getAccountsByArea(@Param('areaId') areaId: string) {
    return this.authService.getAccountsByArea(areaId);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION'])
  @Get('accounts/by-campus/:campusId')
  async getAccountsByCampus(@Param('campusId') campusId: string) {
    return this.authService.getAccountsByCampus(campusId);
  }

  // ====== Profile Management ======
  @UseGuards(AuthGuard)
  @Patch('profile')
  @UseInterceptors(AnyFilesInterceptor())
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser('sub') accountId: string,
    @Body() updateProfileDto: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const avatarFile = files?.find((file) => file.fieldname === 'avatar');
    return this.authService.updateProfile(
      accountId,
      updateProfileDto,
      avatarFile,
    );
  }
}
