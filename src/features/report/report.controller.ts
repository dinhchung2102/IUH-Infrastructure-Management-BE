import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import {
  FilesInterceptor,
  AnyFilesInterceptor,
} from '@nestjs/platform-express';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { QueryReportDto } from './dto/query-report.dto';
import { ApproveReportDto } from './dto/approve-report.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UploadService } from '../../shared/upload/upload.service';
import { Public } from '../auth/decorators/public.decorator';
import { RedisService } from '../../shared/redis/redis.service';

@Controller('report')
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly uploadService: UploadService,
    private readonly redisService: RedisService,
  ) {}

  @Public()
  @Post('send-report-otp')
  @HttpCode(HttpStatus.OK)
  async sendReportOTP(@Body('email') email: string) {
    return this.reportService.sendReportOTP(email);
  }

  @Public()
  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  @HttpCode(HttpStatus.CREATED)
  async createReport(
    @Body() createReportDto: CreateReportDto,
    @CurrentUser() user: JwtPayload | undefined,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.reportService.createReport(createReportDto, user, files);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:READ'])
  @Get()
  async findAllReports(@Query() queryDto: QueryReportDto) {
    return this.reportService.findAllReports(queryDto);
  }

  @UseGuards(AuthGuard)
  @Get('my-reports')
  @HttpCode(HttpStatus.OK)
  async getMyReports(
    @CurrentUser() user: JwtPayload,
    @Query() queryDto: Partial<QueryReportDto>,
  ) {
    if (!user?.sub) {
      throw new UnauthorizedException('User không hợp lệ');
    }
    return this.reportService.getMyReports(user.sub, queryDto);
  }

  // ====== Statistics (phải đặt trước các dynamic routes) ======
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:READ'])
  @Get('stats')
  async getReportStatistics(@Req() req?: any) {
    const cacheKey = req
      ? this.redisService.buildCacheKey(req.path)
      : undefined;
    return this.reportService.getReportStatistics(cacheKey);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:READ'])
  @Get('statistics/dashboard')
  async getReportStatisticsDashboard(@Req() req?: any) {
    const cacheKey = req
      ? this.redisService.buildCacheKey(req.path)
      : undefined;
    return this.reportService.getReportStatistics(cacheKey);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:READ'])
  @Get('statistics/time-series')
  async getTimeSeriesStatistics(
    @Query('type') type: 'daily' | 'weekly' | 'monthly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Req() req?: any,
  ) {
    const cacheKey = req
      ? this.redisService.buildCacheKey(req.path, {
          type,
          startDate,
          endDate,
          status,
        })
      : undefined;
    return this.reportService.getTimeSeriesStatistics(
      type,
      startDate,
      endDate,
      status,
      cacheKey,
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:READ'])
  @Get('statistics/by-location')
  async getStatisticsByLocation(
    @Query('groupBy') groupBy: 'campus' | 'building' | 'area' | 'zone',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Req() req?: any,
  ) {
    const cacheKey = req
      ? this.redisService.buildCacheKey(req.path, {
          groupBy,
          startDate,
          endDate,
        })
      : undefined;
    return this.reportService.getStatisticsByLocation(
      groupBy,
      startDate,
      endDate,
      cacheKey,
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:READ'])
  @Get('statistics/top-assets')
  async getTopAssets(
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Req() req?: any,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const cacheKey = req
      ? this.redisService.buildCacheKey(req.path, {
          limit: limitNum,
          startDate,
          endDate,
        })
      : undefined;
    return this.reportService.getTopAssets(limitNum, startDate, endDate, cacheKey);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:READ'])
  @Get('statistics/top-reporters')
  async getTopReporters(
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Req() req?: any,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const cacheKey = req
      ? this.redisService.buildCacheKey(req.path, {
          limit: limitNum,
          startDate,
          endDate,
        })
      : undefined;
    return this.reportService.getTopReporters(limitNum, startDate, endDate, cacheKey);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:READ'])
  @Get(':id')
  async findOneReport(@Param('id') id: string) {
    return this.reportService.findOneReport(id);
  }

  // ====== Update Status (phải đặt trước PATCH :id) ======
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:UPDATE'])
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateReportStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateReportStatusDto,
    @CurrentUser() user: JwtPayload | undefined,
  ) {
    return this.reportService.updateReportStatus(id, updateStatusDto, user);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:UPDATE'])
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateReport(
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
  ) {
    return this.reportService.updateReport(id, updateReportDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:DELETE'])
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async removeReport(@Param('id') id: string) {
    return this.reportService.removeReport(id);
  }

  @Public()
  @Get('types/list')
  @HttpCode(HttpStatus.OK)
  async getReportTypes() {
    return this.reportService.getReportTypes();
  }

  // ====== Approve Report ======
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:UPDATE'])
  @Post('approve')
  @UseInterceptors(AnyFilesInterceptor())
  @HttpCode(HttpStatus.OK)
  async approveReport(
    @Body() approveReportDto: ApproveReportDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.reportService.approveReport(approveReportDto, files);
  }

  // ====== Upload ======
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:CREATE'])
  @Post('upload/images')
  @UseInterceptors(FilesInterceptor('images', 10)) // Tối đa 10 files
  async uploadReportImages(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{ message: string; data: { urls: string[] } }> {
    const urls = await this.uploadService.uploadMultipleFiles(files);
    return {
      message: 'Upload ảnh báo cáo thành công',
      data: { urls },
    };
  }
}
