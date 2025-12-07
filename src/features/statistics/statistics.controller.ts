import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { QueryStatisticsDto, TimePeriod } from './dto/query-statistics.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  /**
   * 1. Thống kê số lượng báo cáo theo tháng/tuần/năm (biểu đồ cột)
   */
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:READ'])
  @Get('reports/by-period')
  async getReportCountByPeriod(@Query() query: QueryStatisticsDto) {
    return this.statisticsService.getReportCountByPeriod(
      query.period || TimePeriod.MONTH,
      query.startDate,
      query.endDate,
    );
  }

  /**
   * 2. Phân loại các loại báo cáo trong hệ thống (biểu đồ tròn)
   */
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:READ'])
  @Get('reports/by-type')
  async getReportByType() {
    return this.statisticsService.getReportByType();
  }

  /**
   * 3. Thống kê nhiệm vụ (audit) theo nhân viên (tỉ lệ hoàn thành)
   */
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['AUDIT:READ'])
  @Get('audits/by-staff')
  async getAuditByStaff() {
    return this.statisticsService.getAuditByStaff();
  }

  /**
   * 4. Stats tổng hợp: tổng số báo cáo, thiết bị, nhiệm vụ, tỷ lệ hoàn thành
   */
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:READ', 'ASSET:READ', 'AUDIT:READ'], 'OR')
  @Get('overall')
  async getOverallStats() {
    return this.statisticsService.getOverallStats();
  }

  /**
   * 5. Thống kê khu vực có nhiều báo cáo sự cố: theo area, building, zone
   */
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['REPORT:READ'])
  @Get('reports/by-location/:type')
  async getReportByLocation(@Param('type') type: 'area' | 'building' | 'zone') {
    if (!['area', 'building', 'zone'].includes(type)) {
      throw new Error('Type phải là area, building hoặc zone');
    }
    return this.statisticsService.getReportByLocation(type);
  }
}
