import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report, ReportDocument } from '../report/schema/report.schema';
import { AuditLog, AuditLogDocument } from '../audit/schema/auditlog.schema';
import { Account, AccountDocument } from '../auth/schema/account.schema';
import { Role, RoleDocument } from '../auth/schema/role.schema';
import {
  StatisticsReportLog,
  StatisticsReportLogDocument,
} from './schema/statistics-report-log.schema';
import { MailerService } from '@nestjs-modules/mailer';
import { ReportStatus } from '../report/enum/ReportStatus.enum';
import { AuditStatus } from '../audit/enum/AuditStatus.enum';
import { RoleName } from '../auth/enum/role.enum';

export interface StatisticsReport {
  period: 'month' | 'quarter' | 'year';
  startDate: Date;
  endDate: Date;
  reports: {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    resolved: number;
    pending: number;
    inProgress: number;
  };
  audits: {
    total: number;
    byStatus: Record<string, number>;
    completed: number;
    pending: number;
    overdue: number;
  };
  performance: {
    averageResolutionTime: number; // hours
    averageProcessingTime: number; // days
    resolutionRate: number; // percentage
  };
}

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(StatisticsReportLog.name)
    private statisticsReportLogModel: Model<StatisticsReportLogDocument>,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * Generate statistics report for a period
   */
  async generateStatisticsReport(
    period: 'month' | 'quarter' | 'year',
    startDate?: Date,
    endDate?: Date,
  ): Promise<StatisticsReport> {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now);

    // Calculate period dates
    if (period === 'month') {
      start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
      end = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      start = startDate || new Date(now.getFullYear(), quarter * 3, 1);
      end = endDate || new Date(now.getFullYear(), (quarter + 1) * 3, 0);
    } else {
      // year
      start = startDate || new Date(now.getFullYear(), 0, 1);
      end = endDate || new Date(now.getFullYear(), 11, 31);
    }

    // Get reports statistics
    const reports = await this.reportModel.find({
      createdAt: { $gte: start, $lte: end },
    });

    const reportsByStatus = this.groupBy(reports, 'status');
    const reportsByType = this.groupBy(reports, 'type');
    const reportsByPriority = this.groupBy(reports, 'priority');

    // Get audits statistics
    const audits = await this.auditLogModel.find({
      createdAt: { $gte: start, $lte: end },
    });

    const auditsByStatus = this.groupBy(audits, 'status');

    // Calculate overdue audits
    const overdueAudits = audits.filter((audit) => {
      if (!audit.expiresAt || audit.status === AuditStatus.COMPLETED) {
        return false;
      }
      return new Date(audit.expiresAt) < now;
    });

    // Calculate performance metrics
    // Note: RESOLVED, CLOSED, IN_PROGRESS are string statuses used in the system
    const resolvedReports = reports.filter(
      (r) =>
        String(r.status) === 'RESOLVED' || r.status === ReportStatus.APPROVED,
    );
    const averageResolutionTime =
      this.calculateAverageResolutionTime(resolvedReports);
    const averageProcessingTime = this.calculateAverageProcessingTime(audits);
    const resolutionRate =
      reports.length > 0 ? (resolvedReports.length / reports.length) * 100 : 0;

    return {
      period,
      startDate: start,
      endDate: end,
      reports: {
        total: reports.length,
        byStatus: this.countByKey(reportsByStatus),
        byType: this.countByKey(reportsByType),
        byPriority: this.countByKey(reportsByPriority),
        resolved:
          reportsByStatus['RESOLVED']?.length ||
          reportsByStatus[ReportStatus.APPROVED]?.length ||
          0,
        pending: reportsByStatus[ReportStatus.PENDING]?.length || 0,
        inProgress: reportsByStatus['IN_PROGRESS']?.length || 0,
      },
      audits: {
        total: audits.length,
        byStatus: this.countByKey(auditsByStatus),
        completed: auditsByStatus[AuditStatus.COMPLETED]?.length || 0,
        pending: auditsByStatus[AuditStatus.PENDING]?.length || 0,
        overdue: overdueAudits.length,
      },
      performance: {
        averageResolutionTime,
        averageProcessingTime,
        resolutionRate: Math.round(resolutionRate * 100) / 100,
      },
    };
  }

  /**
   * Send statistics report to admins via email
   */
  async sendStatisticsReportToAdmins(
    period: 'month' | 'quarter' | 'year',
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ sent: number; failed: number }> {
    try {
      const report = await this.generateStatisticsReport(
        period,
        startDate,
        endDate,
      );

      // Get admin role IDs first
      const adminRoles = await this.roleModel
        .find({
          roleName: { $in: [RoleName.ADMIN, RoleName.CAMPUS_ADMIN] },
        })
        .select('_id')
        .lean();

      if (adminRoles.length === 0) {
        this.logger.warn('No admin roles found in database');
        return { sent: 0, failed: 0 };
      }

      const adminRoleIds = adminRoles.map((role) => role._id);

      // Get all admin emails
      const admins = await this.accountModel
        .find({
          role: { $in: adminRoleIds },
          isActive: true,
        })
        .populate('role', 'roleName')
        .select('email fullName');

      if (admins.length === 0) {
        this.logger.warn('No admin accounts found to send report');
        return { sent: 0, failed: 0 };
      }

      let sent = 0;
      let failed = 0;

      // Send email to each admin
      for (const admin of admins) {
        try {
          await this.mailerService.sendMail({
            to: admin.email,
            subject: `Báo cáo thống kê ${this.getPeriodLabel(period)} - IUH Infrastructure Management`,
            template: 'statistics-report',
            context: {
              period: this.getPeriodLabel(period),
              startDate: report.startDate.toLocaleDateString('vi-VN'),
              endDate: report.endDate.toLocaleDateString('vi-VN'),
              report: report,
              adminName: admin.fullName || admin.email,
            },
          });

          // Log successful email
          await this.statisticsReportLogModel.create({
            email: admin.email,
            recipientName: admin.fullName || admin.email,
            period,
            startDate: report.startDate,
            endDate: report.endDate,
            status: 'success',
            reportData: {
              reports: report.reports,
              audits: report.audits,
              performance: report.performance,
            },
            isTest: false,
          });

          sent++;
          this.logger.log(`Statistics report sent to admin: ${admin.email}`);
        } catch (error) {
          // Log failed email
          await this.statisticsReportLogModel.create({
            email: admin.email,
            recipientName: admin.fullName || admin.email,
            period,
            startDate: report.startDate,
            endDate: report.endDate,
            status: 'failed',
            errorMessage: error.message,
            reportData: {
              reports: report.reports,
              audits: report.audits,
              performance: report.performance,
            },
            isTest: false,
          });

          failed++;
          this.logger.error(
            `Failed to send report to ${admin.email}: ${error.message}`,
          );
        }
      }

      return { sent, failed };
    } catch (error) {
      this.logger.error(
        `Error sending statistics report: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send statistics report to a specific email (for testing)
   */
  async sendStatisticsReportToEmail(
    email: string,
    period: 'month' | 'quarter' | 'year',
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const report = await this.generateStatisticsReport(
        period,
        startDate,
        endDate,
      );

      await this.mailerService.sendMail({
        to: email,
        subject: `Báo cáo thống kê ${this.getPeriodLabel(period)} - IUH Infrastructure Management (Test)`,
        template: 'statistics-report',
        context: {
          period: this.getPeriodLabel(period),
          startDate: report.startDate.toLocaleDateString('vi-VN'),
          endDate: report.endDate.toLocaleDateString('vi-VN'),
          report: report,
          adminName: email,
        },
      });

      // Log successful test email
      await this.statisticsReportLogModel.create({
        email,
        recipientName: email,
        period,
        startDate: report.startDate,
        endDate: report.endDate,
        status: 'success',
        reportData: {
          reports: report.reports,
          audits: report.audits,
          performance: report.performance,
        },
        isTest: true,
      });

      this.logger.log(`Test statistics report sent to: ${email}`);
      return {
        success: true,
        message: `Report sent successfully to ${email}`,
      };
    } catch (error) {
      // Log failed test email
      try {
        const report = await this.generateStatisticsReport(
          period,
          startDate,
          endDate,
        );
        await this.statisticsReportLogModel.create({
          email,
          recipientName: email,
          period,
          startDate: report.startDate,
          endDate: report.endDate,
          status: 'failed',
          errorMessage: error.message,
          reportData: {
            reports: report.reports,
            audits: report.audits,
            performance: report.performance,
          },
          isTest: true,
        });
      } catch (logError) {
        this.logger.error(`Failed to log email error: ${logError.message}`);
      }

      this.logger.error(
        `Error sending test report to ${email}: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: `Failed to send report: ${error.message}`,
      };
    }
  }

  /**
   * Auto-close old resolved reports (older than specified days)
   */
  async autoCloseOldReports(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.reportModel.updateMany(
        {
          status: { $in: ['RESOLVED', ReportStatus.APPROVED] },
          updatedAt: { $lt: cutoffDate },
        },
        {
          $set: { status: 'CLOSED' },
        },
      );

      this.logger.log(
        `Auto-closed ${result.modifiedCount} reports older than ${daysOld} days`,
      );

      return result.modifiedCount || 0;
    } catch (error) {
      this.logger.error(`Error auto-closing reports: ${error.message}`);
      throw error;
    }
  }

  /**
   * Auto-delete expired audit logs (older than specified days after expiration)
   */
  async autoDeleteExpiredAuditLogs(
    daysAfterExpiration: number = 30,
  ): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAfterExpiration);

      const result = await this.auditLogModel.deleteMany({
        expiresAt: { $lt: cutoffDate },
      });

      this.logger.log(
        `Auto-deleted ${result.deletedCount || 0} expired audit logs`,
      );

      return result.deletedCount || 0;
    } catch (error) {
      this.logger.error(
        `Error auto-deleting expired audit logs: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Send reminder for overdue audits
   */
  async sendOverdueAuditReminders(): Promise<{
    sent: number;
    failed: number;
  }> {
    try {
      const now = new Date();
      const overdueAudits = await this.auditLogModel
        .find({
          status: { $ne: AuditStatus.COMPLETED },
          expiresAt: { $lt: now },
        })
        .populate('staffs', 'email fullName')
        .populate('report', 'description type');

      if (overdueAudits.length === 0) {
        this.logger.log('No overdue audits found');
        return { sent: 0, failed: 0 };
      }

      let sent = 0;
      let failed = 0;

      for (const audit of overdueAudits) {
        const staffs = Array.isArray(audit.staffs) ? audit.staffs : [];
        const emails = staffs
          .map((staff: any) => staff?.email)
          .filter((email: string) => email);

        if (emails.length === 0) continue;

        for (const email of emails) {
          try {
            await this.mailerService.sendMail({
              to: email,
              subject: 'Nhắc nhở: Audit log đã quá hạn xử lý',
              template: 'overdue-audit-reminder',
              context: {
                auditId: audit._id,
                subject: audit.subject,
                description: audit.description,
                expiresAt: audit.expiresAt
                  ? new Date(audit.expiresAt).toLocaleDateString('vi-VN')
                  : 'N/A',
                reportDescription: (audit.report as any)?.description || 'N/A',
              },
            });
            sent++;
          } catch (error) {
            failed++;
            this.logger.error(
              `Failed to send reminder to ${email}: ${error.message}`,
            );
          }
        }
      }

      this.logger.log(`Sent ${sent} overdue audit reminders, ${failed} failed`);

      return { sent, failed };
    } catch (error) {
      this.logger.error(
        `Error sending overdue audit reminders: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Send reminder for audits expiring soon (within specified days)
   */
  async sendExpiringSoonReminders(daysBefore: number = 3): Promise<{
    sent: number;
    failed: number;
  }> {
    try {
      const now = new Date();
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + daysBefore);

      const expiringAudits = await this.auditLogModel
        .find({
          status: { $ne: AuditStatus.COMPLETED },
          expiresAt: {
            $gte: now,
            $lte: warningDate,
          },
        })
        .populate('staffs', 'email fullName')
        .populate('report', 'description type');

      if (expiringAudits.length === 0) {
        this.logger.log('No expiring audits found');
        return { sent: 0, failed: 0 };
      }

      let sent = 0;
      let failed = 0;

      for (const audit of expiringAudits) {
        const staffs = Array.isArray(audit.staffs) ? audit.staffs : [];
        const emails = staffs
          .map((staff: any) => staff?.email)
          .filter((email: string) => email);

        if (emails.length === 0) continue;

        for (const email of emails) {
          try {
            await this.mailerService.sendMail({
              to: email,
              subject: `Nhắc nhở: Audit log sắp hết hạn (còn ${daysBefore} ngày)`,
              template: 'expiring-audit-reminder',
              context: {
                auditId: audit._id,
                subject: audit.subject,
                description: audit.description,
                expiresAt: audit.expiresAt
                  ? new Date(audit.expiresAt).toLocaleDateString('vi-VN')
                  : 'N/A',
                daysRemaining: daysBefore,
                reportDescription: (audit.report as any)?.description || 'N/A',
              },
            });
            sent++;
          } catch (error) {
            failed++;
            this.logger.error(
              `Failed to send reminder to ${email}: ${error.message}`,
            );
          }
        }
      }

      this.logger.log(
        `Sent ${sent} expiring audit reminders, ${failed} failed`,
      );

      return { sent, failed };
    } catch (error) {
      this.logger.error(
        `Error sending expiring audit reminders: ${error.message}`,
      );
      throw error;
    }
  }

  // Helper methods
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce(
      (result, item) => {
        const value = String(item[key] || 'unknown');
        if (!result[value]) {
          result[value] = [];
        }
        result[value].push(item);
        return result;
      },
      {} as Record<string, T[]>,
    );
  }

  private countByKey(grouped: Record<string, any[]>): Record<string, number> {
    return Object.keys(grouped).reduce(
      (result, key) => {
        result[key] = grouped[key].length;
        return result;
      },
      {} as Record<string, number>,
    );
  }

  private calculateAverageResolutionTime(
    resolvedReports: ReportDocument[],
  ): number {
    if (resolvedReports.length === 0) return 0;

    const totalHours = resolvedReports.reduce((sum, report) => {
      const doc = report as any; // timestamps: true adds createdAt/updatedAt
      if (doc.createdAt && doc.updatedAt) {
        const diff =
          new Date(doc.updatedAt).getTime() - new Date(doc.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60); // Convert to hours
      }
      return sum;
    }, 0);

    return Math.round((totalHours / resolvedReports.length) * 100) / 100;
  }

  private calculateAverageProcessingTime(audits: AuditLogDocument[]): number {
    const completedAudits = audits.filter(
      (a) => a.status === AuditStatus.COMPLETED && a.expiresAt,
    );

    if (completedAudits.length === 0) return 0;

    const totalDays = completedAudits.reduce((sum, audit) => {
      const doc = audit as any; // timestamps: true adds createdAt
      if (doc.createdAt && audit.expiresAt) {
        const diff =
          new Date(audit.expiresAt).getTime() -
          new Date(doc.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24); // Convert to days
      }
      return sum;
    }, 0);

    return Math.round((totalDays / completedAudits.length) * 100) / 100;
  }

  private getPeriodLabel(period: 'month' | 'quarter' | 'year'): string {
    const labels = {
      month: 'Tháng',
      quarter: 'Quý',
      year: 'Năm',
    };
    return labels[period];
  }

  /**
   * Get email report logs with pagination and filters
   */
  async getReportLogs(options: {
    email?: string;
    period?: 'month' | 'quarter' | 'year';
    status?: 'success' | 'failed';
    isTest?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    logs: StatisticsReportLogDocument[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  }> {
    const { email, period, status, isTest, page = 1, limit = 20 } = options;

    const filter: Record<string, any> = {};

    if (email) {
      filter.email = { $regex: email, $options: 'i' };
    }

    if (period) {
      filter.period = period;
    }

    if (status) {
      filter.status = status;
    }

    if (isTest !== undefined) {
      filter.isTest = isTest;
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.statisticsReportLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.statisticsReportLogModel.countDocuments(filter),
    ]);

    return {
      logs: logs as StatisticsReportLogDocument[],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  }
}
