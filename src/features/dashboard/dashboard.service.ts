import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset } from '../assets/schema/asset.schema';
import { Account } from '../auth/schema/account.schema';
import { Report } from '../report/schema/report.schema';
import { AuditLog } from '../audit/schema/auditlog.schema';
import { ReportStatus } from '../report/enum/ReportStatus.enum';
import { AuditStatus } from '../audit/enum/AuditStatus.enum';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Asset.name) private assetModel: Model<Asset>,
    @InjectModel(Account.name) private accountModel: Model<Account>,
    @InjectModel(Report.name) private reportModel: Model<Report>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
  ) {}

  async getDashboardStats(): Promise<{
    message: string;
    stats: {
      totalAssets: number;
      activeUsers: number;
      pendingReports: number;
      pendingAudits: number;
    };
    recentReports: any[];
  }> {
    // Get stats in parallel for better performance
    const [
      totalAssets,
      activeUsers,
      pendingReports,
      pendingAudits,
      recentReports,
    ] = await Promise.all([
      // Total assets count
      this.assetModel.countDocuments(),

      // Active users count (isActive = true)
      this.accountModel.countDocuments({ isActive: true }),

      // Pending reports count
      this.reportModel.countDocuments({ status: ReportStatus.PENDING }),

      // Pending audits count (status = PENDING or IN_PROGRESS)
      this.auditLogModel.countDocuments({
        status: { $in: [AuditStatus.PENDING, AuditStatus.IN_PROGRESS] },
      }),

      // Recent reports (4 most recent)
      this.reportModel
        .find()
        .populate({
          path: 'asset',
          select: 'name code status image zone area',
          populate: [
            {
              path: 'zone',
              select: '_id name building',
              populate: {
                path: 'building',
                select: '_id name campus',
                populate: {
                  path: 'campus',
                  select: '_id name',
                },
              },
            },
            {
              path: 'area',
              select: '_id name building',
              populate: {
                path: 'building',
                select: '_id name campus',
                populate: {
                  path: 'campus',
                  select: '_id name',
                },
              },
            },
          ],
        })
        .populate('createdBy', 'fullName email')
        .sort({ createdAt: -1 })
        .limit(4)
        .lean(),
    ]);

    return {
      message: 'Lấy thống kê dashboard thành công',
      stats: {
        totalAssets,
        activeUsers,
        pendingReports,
        pendingAudits,
      },
      recentReports,
    };
  }
}
