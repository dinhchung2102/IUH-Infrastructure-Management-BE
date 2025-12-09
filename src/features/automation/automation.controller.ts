import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { AutomationService } from './automation.service';
import { Public } from '../auth/decorators/public.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Action } from '../auth/enum/action.enum';
import { Resource } from '../auth/enum/resource.enum';
import { N8NWebhookGuard } from './guards/n8n-webhook.guard';

@ApiTags('Automation')
@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  /**
   * N8N Webhook: Send monthly statistics report
   */
  @Post('webhook/send-monthly-report')
  @Public()
  @UseGuards(N8NWebhookGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'N8N Webhook: Gửi báo cáo thống kê tháng',
    description:
      'Webhook endpoint cho N8N để tự động gửi báo cáo thống kê hàng tháng',
  })
  @ApiHeader({
    name: 'x-n8n-webhook-secret',
    description: 'N8N Webhook Secret (from .env)',
    required: false,
  })
  async sendMonthlyReport(
    @Body() body?: { startDate?: string; endDate?: string },
  ) {
    const startDate = body?.startDate ? new Date(body.startDate) : undefined;
    const endDate = body?.endDate ? new Date(body.endDate) : undefined;

    const result = await this.automationService.sendStatisticsReportToAdmins(
      'month',
      startDate,
      endDate,
    );

    return {
      success: true,
      message: 'Monthly statistics report sent',
      data: result,
    };
  }

  /**
   * N8N Webhook: Send quarterly statistics report
   */
  @Post('webhook/send-quarterly-report')
  @Public()
  @UseGuards(N8NWebhookGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'N8N Webhook: Gửi báo cáo thống kê quý',
    description:
      'Webhook endpoint cho N8N để tự động gửi báo cáo thống kê hàng quý',
  })
  @ApiHeader({
    name: 'x-n8n-webhook-secret',
    description: 'N8N Webhook Secret (from .env)',
    required: false,
  })
  async sendQuarterlyReport(
    @Body() body?: { startDate?: string; endDate?: string },
  ) {
    const startDate = body?.startDate ? new Date(body.startDate) : undefined;
    const endDate = body?.endDate ? new Date(body.endDate) : undefined;

    const result = await this.automationService.sendStatisticsReportToAdmins(
      'quarter',
      startDate,
      endDate,
    );

    return {
      success: true,
      message: 'Quarterly statistics report sent',
      data: result,
    };
  }

  /**
   * N8N Webhook: Send yearly statistics report
   */
  @Post('webhook/send-yearly-report')
  @Public()
  @UseGuards(N8NWebhookGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'N8N Webhook: Gửi báo cáo thống kê năm',
    description:
      'Webhook endpoint cho N8N để tự động gửi báo cáo thống kê hàng năm',
  })
  @ApiHeader({
    name: 'x-n8n-webhook-secret',
    description: 'N8N Webhook Secret (from .env)',
    required: false,
  })
  async sendYearlyReport(
    @Body() body?: { startDate?: string; endDate?: string },
  ) {
    const startDate = body?.startDate ? new Date(body.startDate) : undefined;
    const endDate = body?.endDate ? new Date(body.endDate) : undefined;

    const result = await this.automationService.sendStatisticsReportToAdmins(
      'year',
      startDate,
      endDate,
    );

    return {
      success: true,
      message: 'Yearly statistics report sent',
      data: result,
    };
  }

  /**
   * N8N Webhook: Auto-close old reports
   */
  @Post('webhook/auto-close-reports')
  @Public()
  @UseGuards(N8NWebhookGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'N8N Webhook: Tự động đóng report cũ',
    description:
      'Webhook endpoint cho N8N để tự động đóng các report đã resolved quá lâu',
  })
  @ApiHeader({
    name: 'x-n8n-webhook-secret',
    description: 'N8N Webhook Secret (from .env)',
    required: false,
  })
  async autoCloseReports(@Body() body?: { daysOld?: number }) {
    const daysOld = body?.daysOld || 90;

    const count = await this.automationService.autoCloseOldReports(daysOld);

    return {
      success: true,
      message: `Auto-closed ${count} old reports`,
      data: { closedCount: count },
    };
  }

  /**
   * N8N Webhook: Auto-delete expired audit logs
   */
  @Post('webhook/auto-delete-expired-audits')
  @Public()
  @UseGuards(N8NWebhookGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'N8N Webhook: Tự động xóa audit logs hết hạn',
    description:
      'Webhook endpoint cho N8N để tự động xóa các audit logs đã hết hạn',
  })
  @ApiHeader({
    name: 'x-n8n-webhook-secret',
    description: 'N8N Webhook Secret (from .env)',
    required: false,
  })
  async autoDeleteExpiredAudits(
    @Body() body?: { daysAfterExpiration?: number },
  ) {
    const daysAfterExpiration = body?.daysAfterExpiration || 30;

    const count =
      await this.automationService.autoDeleteExpiredAuditLogs(
        daysAfterExpiration,
      );

    return {
      success: true,
      message: `Auto-deleted ${count} expired audit logs`,
      data: { deletedCount: count },
    };
  }

  /**
   * N8N Webhook: Send overdue audit reminders
   */
  @Post('webhook/send-overdue-reminders')
  @Public()
  @UseGuards(N8NWebhookGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'N8N Webhook: Gửi nhắc nhở audit quá hạn',
    description:
      'Webhook endpoint cho N8N để tự động gửi email nhắc nhở cho các audit đã quá hạn',
  })
  @ApiHeader({
    name: 'x-n8n-webhook-secret',
    description: 'N8N Webhook Secret (from .env)',
    required: false,
  })
  async sendOverdueReminders() {
    const result = await this.automationService.sendOverdueAuditReminders();

    return {
      success: true,
      message: 'Overdue audit reminders sent',
      data: result,
    };
  }

  /**
   * N8N Webhook: Send expiring soon reminders
   */
  @Post('webhook/send-expiring-reminders')
  @Public()
  @UseGuards(N8NWebhookGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'N8N Webhook: Gửi nhắc nhở audit sắp hết hạn',
    description:
      'Webhook endpoint cho N8N để tự động gửi email nhắc nhở cho các audit sắp hết hạn',
  })
  @ApiHeader({
    name: 'x-n8n-webhook-secret',
    description: 'N8N Webhook Secret (from .env)',
    required: false,
  })
  async sendExpiringReminders(@Body() body?: { daysBefore?: number }) {
    const daysBefore = body?.daysBefore || 3;

    const result =
      await this.automationService.sendExpiringSoonReminders(daysBefore);

    return {
      success: true,
      message: 'Expiring audit reminders sent',
      data: result,
    };
  }

  /**
   * Get statistics report (for testing or manual trigger)
   */
  @Get('statistics')
  @UseGuards(AuthGuard)
  @RequirePermissions([`${Resource.REPORT}:${Action.READ}`])
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy báo cáo thống kê',
    description: 'Lấy báo cáo thống kê cho một khoảng thời gian',
  })
  @ApiQuery({
    name: 'period',
    enum: ['month', 'quarter', 'year'],
    required: false,
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getStatistics(
    @Query('period') period: 'month' | 'quarter' | 'year' = 'month',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const report = await this.automationService.generateStatisticsReport(
      period,
      start,
      end,
    );

    return {
      message: 'Statistics report generated successfully',
      data: report,
    };
  }
}
