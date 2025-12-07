import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report, type ReportDocument } from '../report/schema/report.schema';
import { Asset, type AssetDocument } from '../assets/schema/asset.schema';
import {
  AuditLog,
  type AuditLogDocument,
} from '../audit/schema/auditlog.schema';
import { Campus, type CampusDocument } from '../campus/schema/campus.schema';
import {
  Building,
  type BuildingDocument,
} from '../zone-area/schema/building.schema';
import { Area, type AreaDocument } from '../zone-area/schema/area.schema';
import { Zone, type ZoneDocument } from '../zone-area/schema/zone.schema';
import { Account, type AccountDocument } from '../auth/schema/account.schema';
import { ReportStatus } from '../report/enum/ReportStatus.enum';
import { AuditStatus } from '../audit/enum/AuditStatus.enum';
import { TimePeriod } from './dto/query-statistics.dto';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
    @InjectModel(Asset.name)
    private readonly assetModel: Model<AssetDocument>,
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    @InjectModel(Campus.name)
    private readonly campusModel: Model<CampusDocument>,
    @InjectModel(Building.name)
    private readonly buildingModel: Model<BuildingDocument>,
    @InjectModel(Area.name)
    private readonly areaModel: Model<AreaDocument>,
    @InjectModel(Zone.name)
    private readonly zoneModel: Model<ZoneDocument>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
  ) {}

  /**
   * 1. Thống kê số lượng báo cáo theo tháng/tuần/năm (biểu đồ cột)
   */
  async getReportCountByPeriod(
    period: TimePeriod = TimePeriod.MONTH,
    startDate?: string,
    endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();

    // Set time to start/end of day
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    let groupFormat: Record<string, any>;

    switch (period) {
      case TimePeriod.WEEK:
        // Group by week
        groupFormat = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' },
        };
        break;
      case TimePeriod.MONTH:
        // Group by month
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
        break;
      case TimePeriod.YEAR:
        // Group by year
        groupFormat = {
          year: { $year: '$createdAt' },
        };
        break;
    }

    const results = await this.reportModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: groupFormat,
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 },
      },
    ]);

    // Format results for chart
    const chartData = results.map((item) => {
      let label = '';
      if (period === TimePeriod.WEEK) {
        label = `${item._id.year}-W${String(item._id.week).padStart(2, '0')}`;
      } else if (period === TimePeriod.MONTH) {
        label = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      } else {
        label = String(item._id.year);
      }

      return {
        period: label,
        count: item.count,
      };
    });

    return {
      message: 'Lấy thống kê báo cáo theo thời gian thành công',
      data: {
        period,
        chartData,
        total: results.reduce((sum, item) => sum + item.count, 0),
      },
    };
  }

  /**
   * 2. Phân loại các loại báo cáo trong hệ thống (biểu đồ tròn)
   */
  async getReportByType() {
    const results = await this.reportModel.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const total = results.reduce((sum, item) => sum + item.count, 0);

    const chartData = results.map((item) => ({
      type: item._id,
      label: this.getReportTypeLabel(item._id),
      count: item.count,
      percentage:
        total > 0 ? Math.round((item.count / total) * 100 * 10) / 10 : 0,
    }));

    return {
      message: 'Lấy thống kê báo cáo theo loại thành công',
      data: {
        chartData,
        total,
      },
    };
  }

  /**
   * 3. Thống kê nhiệm vụ (audit) theo nhân viên (tỉ lệ hoàn thành)
   */
  async getAuditByStaff() {
    const results = await this.auditLogModel.aggregate([
      {
        $unwind: '$staffs',
      },
      {
        $group: {
          _id: '$staffs',
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', AuditStatus.COMPLETED] }, 1, 0],
            },
          },
          inProgress: {
            $sum: {
              $cond: [{ $eq: ['$status', AuditStatus.IN_PROGRESS] }, 1, 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', AuditStatus.PENDING] }, 1, 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'accounts',
          localField: '_id',
          foreignField: '_id',
          as: 'staff',
        },
      },
      {
        $unwind: '$staff',
      },
      {
        $project: {
          staffId: '$_id',
          staffName: '$staff.fullName',
          staffEmail: '$staff.email',
          total: 1,
          completed: 1,
          inProgress: 1,
          pending: 1,
          completionRate: {
            $cond: [
              { $gt: ['$total', 0] },
              {
                $multiply: [{ $divide: ['$completed', '$total'] }, 100],
              },
              0,
            ],
          },
        },
      },
      {
        $sort: { total: -1 },
      },
    ]);

    return {
      message: 'Lấy thống kê nhiệm vụ theo nhân viên thành công',
      data: results,
    };
  }

  /**
   * 4. Stats tổng hợp: tổng số báo cáo, thiết bị, nhiệm vụ, tỷ lệ hoàn thành
   */
  async getOverallStats() {
    const [
      totalReports,
      totalAssets,
      totalAuditLogs,
      completedAuditLogs,
      approvedReports,
    ] = await Promise.all([
      this.reportModel.countDocuments(),
      this.assetModel.countDocuments(),
      this.auditLogModel.countDocuments(),
      this.auditLogModel.countDocuments({
        status: AuditStatus.COMPLETED,
      }),
      this.reportModel.countDocuments({
        status: ReportStatus.APPROVED,
      }),
    ]);

    const completionRate =
      totalAuditLogs > 0
        ? Math.round((completedAuditLogs / totalAuditLogs) * 100 * 10) / 10
        : 0;

    const resolutionRate =
      totalReports > 0
        ? Math.round((approvedReports / totalReports) * 100 * 10) / 10
        : 0;

    return {
      message: 'Lấy thống kê tổng hợp thành công',
      data: {
        totalReports,
        totalAssets,
        totalAuditLogs,
        completedAuditLogs,
        completionRate,
        resolutionRate,
      },
    };
  }

  /**
   * 5. Thống kê khu vực có nhiều báo cáo sự cố: theo area, building, zone
   */
  async getReportByLocation(type: 'area' | 'building' | 'zone' = 'zone') {
    let lookupStage: any;
    let groupField: string;

    if (type === 'zone') {
      lookupStage = [
        {
          $lookup: {
            from: 'assets',
            localField: 'asset',
            foreignField: '_id',
            as: 'assetData',
          },
        },
        { $unwind: { path: '$assetData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'zones',
            localField: 'assetData.zone',
            foreignField: '_id',
            as: 'zoneData',
          },
        },
        { $unwind: { path: '$zoneData', preserveNullAndEmptyArrays: true } },
      ];
      groupField = '$zoneData._id';
    } else if (type === 'area') {
      lookupStage = [
        {
          $lookup: {
            from: 'assets',
            localField: 'asset',
            foreignField: '_id',
            as: 'assetData',
          },
        },
        { $unwind: { path: '$assetData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'areas',
            localField: 'assetData.area',
            foreignField: '_id',
            as: 'areaData',
          },
        },
        { $unwind: { path: '$areaData', preserveNullAndEmptyArrays: true } },
      ];
      groupField = '$areaData._id';
    } else {
      // building
      lookupStage = [
        {
          $lookup: {
            from: 'assets',
            localField: 'asset',
            foreignField: '_id',
            as: 'assetData',
          },
        },
        { $unwind: { path: '$assetData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'zones',
            localField: 'assetData.zone',
            foreignField: '_id',
            as: 'zoneData',
          },
        },
        { $unwind: { path: '$zoneData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'buildings',
            localField: 'zoneData.building',
            foreignField: '_id',
            as: 'buildingData',
          },
        },
        {
          $unwind: { path: '$buildingData', preserveNullAndEmptyArrays: true },
        },
      ];
      groupField = '$buildingData._id';
    }

    const results = await this.reportModel.aggregate([
      ...lookupStage,
      {
        $group: {
          _id: groupField,
          count: { $sum: 1 },
          locationName: {
            $first:
              type === 'zone'
                ? '$zoneData.name'
                : type === 'area'
                  ? '$areaData.name'
                  : '$buildingData.name',
          },
        },
      },
      {
        $match: {
          _id: { $ne: null },
        },
      },
      {
        $project: {
          _id: 0,
          locationId: '$_id',
          location: '$locationName',
          count: 1,
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    return {
      message: `Lấy thống kê báo cáo theo ${type} thành công`,
      data: {
        type,
        chartData: results,
        total: results.reduce((sum, item) => sum + item.count, 0),
      },
    };
  }

  /**
   * Helper: Get report type label
   */
  private getReportTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      MAINTENANCE: 'Bảo trì',
      BUY_NEW: 'Mua mới',
      DAMAGED: 'Hỏng hóc',
      LOST: 'Thất lạc',
      OTHER: 'Khác',
    };
    return labels[type] || type;
  }
}
