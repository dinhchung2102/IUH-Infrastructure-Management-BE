import { Controller, Get, Query, UseGuards, Param, Req } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { QueryStatisticsDto, TimePeriod } from './dto/query-statistics.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators';
import { RedisService } from '../../shared/redis/redis.service';

@Controller('statistics')
export class StatisticsController {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 1. Thống kê số lượng báo cáo theo tháng/tuần/năm (biểu đồ cột)
   */
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:READ'])
  @Get('reports/by-period')
  async getReportCountByPeriod(
    @Query() query: QueryStatisticsDto,
    @Req() req?: any,
  ) {
    const cacheKey = req
      ? this.redisService.buildCacheKey(req.path, {
          period: query.period || TimePeriod.MONTH,
          startDate: query.startDate,
          endDate: query.endDate,
        })
      : undefined;
    return this.statisticsService.getReportCountByPeriod(
      query.period || TimePeriod.MONTH,
      query.startDate,
      query.endDate,
      cacheKey,
    );
  }

  /**
   * 2. Phân loại các loại báo cáo trong hệ thống (biểu đồ tròn)
   */
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:READ'])
  @Get('reports/by-type')
  async getReportByType(@Req() req?: any) {
    const cacheKey = req
      ? this.redisService.buildCacheKey(req.path)
      : undefined;
    return this.statisticsService.getReportByType(cacheKey);
  }

  /**
   * 3. Thống kê nhiệm vụ (audit) theo nhân viên (tỉ lệ hoàn thành)
   */
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['AUDIT:READ'])
  @Get('audits/by-staff')
  async getAuditByStaff(@Req() req?: any) {
    const cacheKey = req
      ? this.redisService.buildCacheKey(req.path)
      : undefined;
    return this.statisticsService.getAuditByStaff(cacheKey);
  }

  /**
   * 4. Stats tổng hợp: tổng số báo cáo, thiết bị, nhiệm vụ, tỷ lệ hoàn thành
   */
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:READ', 'ASSET:READ', 'AUDIT:READ'], 'OR')
  @Get('overall')
  async getOverallStats(@Req() req?: any) {
    const cacheKey = req
      ? this.redisService.buildCacheKey(req.path)
      : undefined;
    return this.statisticsService.getOverallStats(cacheKey);
  }

  /**
   * 5. Thống kê khu vực có nhiều báo cáo sự cố: theo area, building, zone
   */
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:READ'])
  @Get('reports/by-location/:type')
  async getReportByLocation(
    @Param('type') type: 'area' | 'building' | 'zone',
    @Req() req?: any,
  ) {
    if (!['area', 'building', 'zone'].includes(type)) {
      throw new Error('Type phải là area, building hoặc zone');
    }
    const cacheKey = req
      ? this.redisService.buildCacheKey(req.path, { type })
      : undefined;
    return this.statisticsService.getReportByLocation(type, cacheKey);
  }
}
