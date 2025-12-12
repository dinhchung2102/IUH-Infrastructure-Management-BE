import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Report, type ReportDocument } from './schema/report.schema';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { QueryReportDto } from './dto/query-report.dto';
import { ApproveReportDto } from './dto/approve-report.dto';
import { UploadService } from '../../shared/upload/upload.service';
import {
  REPORT_TYPE_LABELS,
  type ReportTypeLabel,
} from './config/report-type-labels.config';
import { ReportStatus } from './enum/ReportStatus.enum';
import { ReportPriority } from './enum/ReportPriority.enum';
import { RedisService } from '../../shared/redis/redis.service';
import { MailerService } from '@nestjs-modules/mailer';
import { RoleName } from '../auth/enum/role.enum';
import {
  AuditLog,
  type AuditLogDocument,
} from '../audit/schema/auditlog.schema';
import { Account, type AccountDocument } from '../auth/schema/account.schema';
import { Role, type RoleDocument } from '../auth/schema/role.schema';
import { AuditStatus } from '../audit/enum/AuditStatus.enum';
import { EventsService } from '../../shared/events/events.service';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { SyncService } from '../ai/services/sync.service';
import { ClassificationService } from '../ai/services/classification.service';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    private readonly uploadService: UploadService,
    private readonly redisService: RedisService,
    private readonly mailerService: MailerService,
    private readonly eventsService: EventsService,
    @Inject(forwardRef(() => SyncService))
    private syncService?: SyncService, // Optional để tránh circular dependency
    @Inject(forwardRef(() => ClassificationService))
    private classificationService?: ClassificationService, // Optional để tránh circular dependency
  ) {}

  async sendReportOTP(email: string): Promise<{ message: string }> {
    if (!email) {
      throw new BadRequestException('Email không được để trống');
    }

    // Tạo OTP 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Lưu OTP vào Redis (TTL 5 phút)
    await this.redisService.setOtp(email, otp);

    // Kiểm tra email đã có trong hệ thống chưa
    const existingAccount = await this.reportModel.db
      .collection('accounts')
      .findOne({ email });

    if (existingAccount) {
      // Đã có tài khoản => gửi OTP báo cáo
      await this.mailerService.sendMail({
        to: email,
        subject: `${otp} là mã xác thực báo cáo của bạn`,
        template: 'otp',
        context: { otp },
      });

      return {
        message: 'Mã OTP đã được gửi tới email của bạn để xác thực báo cáo',
      };
    } else {
      // Chưa có tài khoản => gửi OTP đăng ký
      await this.mailerService.sendMail({
        to: email,
        subject: `${otp} là mã xác thực đăng ký tài khoản và tạo báo cáo`,
        template: 'otp',
        context: { otp },
      });

      return {
        message:
          'Mã OTP đã được gửi tới email của bạn để đăng ký tài khoản và tạo báo cáo',
      };
    }
  }

  async createReport(
    createReportDto: CreateReportDto,
    user?: { sub: string },
    files?: Express.Multer.File[],
  ): Promise<{
    message: string;
    data: any;
  }> {
    // Xử lý upload files nếu có
    if (files && files.length > 0) {
      const imageFiles = files.filter((file) => file.fieldname === 'images');
      if (imageFiles.length > 0) {
        const imageUrls =
          await this.uploadService.uploadMultipleFiles(imageFiles);
        createReportDto.images = imageUrls;
      }
    }

    // Validate: Phải có ít nhất 1 ảnh (từ files hoặc URLs)
    if (!createReportDto.images || createReportDto.images.length === 0) {
      throw new BadRequestException(
        'Vui lòng upload ít nhất 1 hình ảnh hoặc cung cấp URL hình ảnh',
      );
    }

    // Kiểm tra asset có tồn tại không
    const asset = await this.reportModel.db
      .collection('assets')
      .findOne({ _id: new Types.ObjectId(createReportDto.asset) });
    if (!asset) {
      throw new NotFoundException('Asset không tồn tại');
    }

    // Auto-classify priority and processing days using AI if not provided
    let priority = createReportDto.priority;
    let suggestedProcessingDays: number | undefined;

    if (this.classificationService) {
      try {
        this.logger.log(
          'AI auto-classifying report priority and processing days...',
        );
        const classification = await this.classificationService.classifyReport(
          createReportDto.description,
          asset.name as string, // Use asset name as location context
        );

        if (!priority) {
          priority = classification.priority as any;
          this.logger.log(`AI classified priority: ${priority}`);
        }

        // Luôn lấy suggestedProcessingDays từ AI
        suggestedProcessingDays = classification.processingDays;
        this.logger.log(
          `AI suggested processing days: ${suggestedProcessingDays} days`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to auto-classify: ${error.message}. Using defaults`,
        );
        if (!priority) {
          priority = 'MEDIUM' as any;
        }
        suggestedProcessingDays = 3; // Default 3 ngày
      }
    }

    let createdById: Types.ObjectId;

    // Logic phân nhánh: Có token vs Không có token
    if (user?.sub) {
      // ✅ CÓ TOKEN (đã login) - không cần OTP
      createdById = new Types.ObjectId(user.sub);
    } else {
      // ⚠️ KHÔNG CÓ TOKEN (guest) - bắt buộc email + OTP
      if (!createReportDto.email || !createReportDto.authOTP) {
        throw new BadRequestException(
          'Vui lòng cung cấp email và OTP để tạo báo cáo',
        );
      }

      // Validate OTP
      const otpData = await this.redisService.getOtp(createReportDto.email);
      if (!otpData) {
        throw new UnauthorizedException('OTP không tồn tại hoặc đã hết hạn');
      }

      if (otpData.otp !== createReportDto.authOTP) {
        throw new UnauthorizedException('OTP không hợp lệ');
      }

      // Xóa OTP sau khi verify thành công
      await this.redisService.delete(`otp:${createReportDto.email}`);

      // Tìm hoặc tạo user
      const account = await this.reportModel.db
        .collection('accounts')
        .findOne({ email: createReportDto.email });

      if (!account) {
        // Tạo tài khoản mới với role GUEST
        let roleName = RoleName.GUEST;
        if (createReportDto.email.includes('@student.iuh.edu.vn')) {
          roleName = RoleName.STUDENT;
        }
        const role = await this.reportModel.db
          .collection('roles')
          .findOne({ roleName: roleName });

        if (!role) {
          throw new NotFoundException('Role GUEST không tồn tại');
        }

        const result = await this.reportModel.db
          .collection('accounts')
          .insertOne({
            email: createReportDto.email,
            fullName: createReportDto.email.split('@')[0],
            role: role._id,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

        createdById = result.insertedId as Types.ObjectId;
      } else {
        createdById = account._id as Types.ObjectId;
      }
    }

    const newReport = new this.reportModel({
      asset: new Types.ObjectId(createReportDto.asset),
      type: createReportDto.type,
      description: createReportDto.description,
      images: createReportDto.images,
      createdBy: createdById,
      status: ReportStatus.PENDING,
      priority: priority,
      suggestedProcessingDays: suggestedProcessingDays,
    });

    const savedReport = await newReport.save();
    await savedReport.populate([
      { path: 'asset', select: 'name code status' },
      { path: 'createdBy', select: 'fullName email' },
    ]);

    // Auto-index to Qdrant for RAG
    if (this.syncService) {
      this.syncService.onReportCreated(savedReport).catch((error) => {
        this.logger.warn(
          `Failed to index report ${savedReport._id}: ${error.message}`,
        );
      });
    }

    // Send socket notification if report is CRITICAL priority
    if (priority === ReportPriority.CRITICAL) {
      // Populate location information before sending notification
      await savedReport.populate({
        path: 'asset',
        select: 'name code status zone area',
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
      });

      this.notifyCriticalReportToStaffAndAdmins(savedReport).catch((error) => {
        this.logger.error(
          `Failed to send critical report notification: ${error.message}`,
        );
      });
    }

    return {
      message: 'Tạo báo cáo thành công',
      data: savedReport,
    };
  }

  /**
   * Notify all staff and admins via socket when a critical report is created
   */
  private async notifyCriticalReportToStaffAndAdmins(
    report: ReportDocument,
  ): Promise<void> {
    try {
      const reportId = String((report as any).id || (report as any)._id);
      this.logger.log(
        `[notifyCriticalReport] Sending critical report notification for report: ${reportId}`,
      );

      // Get staff and admin role IDs
      const staffAndAdminRoles = await this.roleModel
        .find({
          roleName: {
            $in: [RoleName.ADMIN, RoleName.CAMPUS_ADMIN, RoleName.STAFF],
          },
        })
        .select('_id')
        .lean();

      if (staffAndAdminRoles.length === 0) {
        this.logger.warn(
          '[notifyCriticalReport] No staff/admin roles found in database',
        );
        return;
      }

      const roleIds = staffAndAdminRoles.map((role) => role._id);

      // Get all staff and admin accounts
      const staffAndAdmins = await this.accountModel
        .find({
          role: { $in: roleIds },
          isActive: true,
        })
        .select('_id email fullName')
        .lean();

      if (staffAndAdmins.length === 0) {
        this.logger.warn(
          '[notifyCriticalReport] No active staff/admin accounts found',
        );
        return;
      }

      // Prepare notification payload with location information
      const createdAt = (report as any).createdAt || new Date();
      const asset = report.asset as any;

      // Extract location information
      let location: {
        campus?: { id: string; name: string };
        building?: { id: string; name: string };
        zone?: { id: string; name: string };
        area?: { id: string; name: string };
        fullPath?: string; // Full location path string
      } = {};

      // Asset can have either zone or area (or both)
      if (asset?.zone) {
        const zone = asset.zone;
        const building = zone.building;
        const campus = building?.campus;

        location.zone = {
          id: String(zone._id || zone.id),
          name: zone.name,
        };

        if (building) {
          location.building = {
            id: String(building._id || building.id),
            name: building.name,
          };
        }

        if (campus) {
          location.campus = {
            id: String(campus._id || campus.id),
            name: campus.name,
          };
        }

        // Build full path: Campus > Building > Zone
        const pathParts: string[] = [];
        if (campus?.name) pathParts.push(campus.name);
        if (building?.name) pathParts.push(building.name);
        if (zone.name) pathParts.push(zone.name);
        location.fullPath = pathParts.join(' > ');
      }

      if (asset?.area) {
        const area = asset.area;
        const building = area.building;
        const campus = building?.campus;

        location.area = {
          id: String(area._id || area.id),
          name: area.name,
        };

        if (building && !location.building) {
          location.building = {
            id: String(building._id || building.id),
            name: building.name,
          };
        }

        if (campus && !location.campus) {
          location.campus = {
            id: String(campus._id || campus.id),
            name: campus.name,
          };
        }

        // Build full path: Campus > Building > Area (or append to existing)
        if (!location.fullPath) {
          const pathParts: string[] = [];
          if (campus?.name) pathParts.push(campus.name);
          if (building?.name) pathParts.push(building.name);
          if (area.name) pathParts.push(area.name);
          location.fullPath = pathParts.join(' > ');
        }
      }

      const notification = {
        type: 'error' as const, // Use 'error' type for critical reports
        title: 'Báo cáo khẩn cấp mới',
        message: `Sự cố khẩn cấp: ${location.fullPath ? ` tại ${location.fullPath}` : ''}: ${report.description?.substring(0, 100)}...`,
        data: {
          reportId,
          assetId: asset?._id ? String(asset._id) : undefined,
          assetName: asset?.name,
          assetCode: asset?.code,
          priority: report.priority,
          reportType: report.type,
          description: report.description,
          createdAt,
          createdBy: (report.createdBy as any)?._id
            ? String((report.createdBy as any)._id)
            : undefined,
          createdByName: (report.createdBy as any)?.fullName,
          location, // Location information
        },
        timestamp: new Date(),
      };

      // Send notification to each staff/admin
      let notifiedCount = 0;
      for (const account of staffAndAdmins) {
        try {
          this.eventsService.sendNotificationToUser(
            account._id.toString(),
            notification,
          );
          notifiedCount++;
        } catch (error) {
          this.logger.warn(
            `[notifyCriticalReport] Failed to notify user ${account._id}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `[notifyCriticalReport] Sent critical report notification to ${notifiedCount}/${staffAndAdmins.length} staff/admin accounts`,
      );
    } catch (error) {
      this.logger.error(
        `[notifyCriticalReport] Error sending critical report notification: ${error.message}`,
        error.stack,
      );
    }
  }

  async findAllReports(queryDto: QueryReportDto): Promise<{
    message: string;
    reports: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  }> {
    const {
      search,
      asset,
      type,
      status,
      createdBy,
      fromDate,
      toDate,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {};

    // Tìm kiếm theo mô tả
    if (search) {
      filter.description = { $regex: search, $options: 'i' };
    }

    if (asset) {
      filter.asset = new Types.ObjectId(asset);
    }
    if (type) {
      filter.type = type;
    }
    if (status) {
      filter.status = status;
    }
    if (createdBy) {
      filter.createdBy = new Types.ObjectId(createdBy);
    }

    // Date range filter
    if (fromDate || toDate) {
      const dateFilter: any = {};
      if (fromDate) {
        dateFilter.$gte = new Date(fromDate);
      }
      if (toDate) {
        const endDateTime = new Date(toDate);
        endDateTime.setHours(23, 59, 59, 999); // End of day
        dateFilter.$lte = endDateTime;
      }
      filter.createdAt = dateFilter;
    }

    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [reports, total] = await Promise.all([
      this.reportModel
        .find(filter)
        .populate({
          path: 'asset',
          select: 'name code status zone area image',
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
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.reportModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return {
      message: 'Lấy danh sách báo cáo thành công',
      reports,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
      },
    };
  }

  async getMyReports(
    userId: string,
    queryDto: Partial<QueryReportDto>,
  ): Promise<{
    message: string;
    reports: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
    summary: {
      total: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
    };
  }> {
    const {
      search,
      asset,
      type,
      status,
      fromDate,
      toDate,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Always filter by current user
    const filter: Record<string, any> = {
      createdBy: new Types.ObjectId(userId),
    };

    // Tìm kiếm theo mô tả
    if (search) {
      filter.description = { $regex: search, $options: 'i' };
    }

    if (asset) {
      filter.asset = new Types.ObjectId(asset);
    }
    if (type) {
      filter.type = type;
    }
    if (status) {
      filter.status = status;
    }

    // Date range filter
    if (fromDate || toDate) {
      const dateFilter: any = {};
      if (fromDate) {
        dateFilter.$gte = new Date(fromDate);
      }
      if (toDate) {
        const endDateTime = new Date(toDate);
        endDateTime.setHours(23, 59, 59, 999); // End of day
        dateFilter.$lte = endDateTime;
      }
      filter.createdAt = dateFilter;
    }

    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get reports with pagination
    const [reports, total, statusStats, typeStats] = await Promise.all([
      this.reportModel
        .find(filter)
        .populate({
          path: 'asset',
          select: 'name code status zone area image',
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
        .populate('rejectedBy', 'fullName email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.reportModel.countDocuments(filter),
      // Get statistics by status
      this.reportModel.aggregate([
        { $match: { createdBy: new Types.ObjectId(userId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Get statistics by type
      this.reportModel.aggregate([
        { $match: { createdBy: new Types.ObjectId(userId) } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ]);

    // Format statistics
    const byStatus: Record<string, number> = {};
    statusStats.forEach((stat: any) => {
      byStatus[stat._id] = stat.count;
    });

    const byType: Record<string, number> = {};
    typeStats.forEach((stat: any) => {
      byType[stat._id] = stat.count;
    });

    const totalPages = Math.ceil(total / limitNum);

    return {
      message: 'Lấy danh sách báo cáo của bạn thành công',
      reports,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
      },
      summary: {
        total,
        byStatus,
        byType,
      },
    };
  }

  async findOneReport(id: string): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('ID báo cáo không hợp lệ');
    }

    const report = await this.reportModel
      .findById(id)
      .populate({
        path: 'asset',
        select: 'name code status zone area',
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
      .lean();

    if (!report) {
      throw new NotFoundException('Báo cáo không tồn tại');
    }

    return {
      message: 'Lấy thông tin báo cáo thành công',
      data: report,
    };
  }

  async updateReport(
    id: string,
    updateReportDto: UpdateReportDto,
  ): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('ID báo cáo không hợp lệ');
    }

    const existingReport = await this.reportModel.findById(id);
    if (!existingReport) {
      throw new NotFoundException('Báo cáo không tồn tại');
    }

    // Kiểm tra asset có tồn tại không (nếu có thay đổi)
    if (updateReportDto.asset) {
      const asset = await this.reportModel.db
        .collection('assets')
        .findOne({ _id: new Types.ObjectId(updateReportDto.asset) });
      if (!asset) {
        throw new NotFoundException('Asset không tồn tại');
      }
    }

    const updateData: Record<string, any> = { ...updateReportDto };
    if (updateReportDto.asset) {
      updateData.asset = new Types.ObjectId(updateReportDto.asset);
    }

    const updatedReport = await this.reportModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('asset', 'name code status')
      .populate('createdBy', 'fullName email');

    // Auto-update index in Qdrant for RAG
    if (this.syncService && updatedReport) {
      this.syncService.onReportUpdated(updatedReport).catch((error) => {
        this.logger.warn(
          `Failed to update index for report ${id}: ${error.message}`,
        );
      });
    }

    return {
      message: 'Cập nhật báo cáo thành công',
      data: updatedReport,
    };
  }

  async updateReportStatus(
    id: string,
    updateStatusDto: UpdateReportStatusDto,
    user?: { sub: string },
  ): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('ID báo cáo không hợp lệ');
    }

    const existingReport = await this.reportModel.findById(id);
    if (!existingReport) {
      throw new NotFoundException('Báo cáo không tồn tại');
    }

    // Validate rejectReason when rejecting
    if (updateStatusDto.status === ReportStatus.REJECTED) {
      if (
        !updateStatusDto.rejectReason ||
        updateStatusDto.rejectReason.trim() === ''
      ) {
        throw new BadRequestException(
          'Lý do từ chối là bắt buộc khi từ chối báo cáo',
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      status: updateStatusDto.status,
    };

    // Handle reject case
    if (updateStatusDto.status === ReportStatus.REJECTED) {
      updateData.rejectReason = updateStatusDto.rejectReason;
      updateData.rejectedAt = new Date();
      if (user?.sub) {
        updateData.rejectedBy = new Types.ObjectId(user.sub);
      }
    } else {
      // Clear rejectReason when status is not REJECTED
      updateData.rejectReason = null;
      updateData.rejectedBy = null;
      updateData.rejectedAt = null;
    }

    const updatedReport = await this.reportModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('asset', 'name code status')
      .populate('createdBy', 'fullName email')
      .populate('rejectedBy', 'fullName email');

    // Auto-update index in Qdrant for RAG
    if (this.syncService && updatedReport) {
      this.syncService.onReportUpdated(updatedReport).catch((error) => {
        this.logger.warn(
          `Failed to update index for report ${id}: ${error.message}`,
        );
      });
    }

    // Send email notification to reporter
    if (updatedReport && updatedReport.createdBy) {
      const reporter = updatedReport.createdBy as any;
      const reporterEmail = reporter.email;
      const reporterName = reporter.fullName || reporterEmail;

      if (reporterEmail) {
        try {
          if (updateStatusDto.status === ReportStatus.APPROVED) {
            // Send approved email
            await this.mailerService.sendMail({
              to: reporterEmail,
              subject:
                'Báo cáo đã được phê duyệt - IUH Infrastructure Management',
              template: 'report-approved',
              context: {
                reporterName,
                reportId: updatedReport._id.toString(),
                reportType:
                  REPORT_TYPE_LABELS.find(
                    (label) => label.value === updatedReport.type,
                  )?.label || updatedReport.type,
                description: updatedReport.description,
                assetName: (updatedReport.asset as any)?.name,
                assetCode: (updatedReport.asset as any)?.code,
                approvedAt: new Date().toLocaleString('vi-VN'),
              },
            });
            this.logger.log(
              `Approved email sent to ${reporterEmail} for report ${id}`,
            );
          } else if (updateStatusDto.status === ReportStatus.REJECTED) {
            // Send rejected email
            const rejectedBy = updatedReport.rejectedBy as any;
            await this.mailerService.sendMail({
              to: reporterEmail,
              subject: 'Báo cáo bị từ chối - IUH Infrastructure Management',
              template: 'report-rejected',
              context: {
                reporterName,
                reportId: updatedReport._id.toString(),
                reportType:
                  REPORT_TYPE_LABELS.find(
                    (label) => label.value === updatedReport.type,
                  )?.label || updatedReport.type,
                description: updatedReport.description,
                assetName: (updatedReport.asset as any)?.name,
                assetCode: (updatedReport.asset as any)?.code,
                rejectReason:
                  updateStatusDto.rejectReason || 'Không có lý do cụ thể',
                rejectedAt: new Date().toLocaleString('vi-VN'),
                rejectedByName:
                  rejectedBy?.fullName || rejectedBy?.email || 'Hệ thống',
              },
            });
            this.logger.log(
              `Rejected email sent to ${reporterEmail} for report ${id}`,
            );
          }
        } catch (error: any) {
          this.logger.error(
            `Failed to send email notification to ${reporterEmail}: ${error.message}`,
          );
          // Don't throw error, just log it
        }
      }
    }

    return {
      message: 'Cập nhật trạng thái báo cáo thành công',
      data: updatedReport,
    };
  }

  async removeReport(id: string): Promise<{
    message: string;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('ID báo cáo không hợp lệ');
    }

    const report = await this.reportModel.findById(id);
    if (!report) {
      throw new NotFoundException('Báo cáo không tồn tại');
    }

    await this.reportModel.findByIdAndDelete(id);

    // Auto-delete from Qdrant for RAG
    if (this.syncService) {
      this.syncService.onReportDeleted(id).catch((error) => {
        this.logger.warn(
          `Failed to delete index for report ${id}: ${error.message}`,
        );
      });
    }

    return {
      message: 'Xóa báo cáo thành công',
    };
  }

  async getReportStatistics(cacheKey?: string): Promise<{
    message: string;
    data: {
      totalReports: number;
      reportsByStatus: {
        OPEN: number;
        IN_PROGRESS: number;
        RESOLVED: number;
        CLOSED: number;
      };
      reportsByType: {
        ISSUE: number;
        MAINTENANCE: number;
        REQUEST: number;
      };
      reportsByPriority: {
        LOW: number;
        MEDIUM: number;
        HIGH: number;
        CRITICAL: number;
      };
      recentReports: any[];
      reportsThisMonth: number;
      reportsLastMonth: number;
      averageResolutionTime: number; // in days
    };
  }> {
    const key =
      cacheKey || this.redisService.buildCacheKey('/api/report/stats');

    // Try to get from cache
    const cached = await this.redisService.getCached<any>(key);
    if (cached) {
      return cached;
    }

    // Tổng số báo cáo
    const totalReports = await this.reportModel.countDocuments();

    // Thống kê theo status
    const reportsByStatus = await this.reportModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusStats = {
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };

    reportsByStatus.forEach((stat) => {
      statusStats[stat._id as keyof typeof statusStats] = stat.count;
    });

    // Thống kê theo type
    const reportsByType = await this.reportModel.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    const typeStats = {
      ISSUE: 0,
      MAINTENANCE: 0,
      REQUEST: 0,
    };

    reportsByType.forEach((stat) => {
      typeStats[stat._id as keyof typeof typeStats] = stat.count;
    });

    // Thống kê theo priority
    const reportsByPriority = await this.reportModel.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
        },
      },
    ]);

    const priorityStats = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    reportsByPriority.forEach((stat) => {
      priorityStats[stat._id as keyof typeof priorityStats] = stat.count;
    });

    // Báo cáo gần đây (5 báo cáo mới nhất)
    const recentReports = await this.reportModel
      .find()
      .populate('asset', 'name code')
      .populate('createdBy', 'fullName')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title type status priority createdAt')
      .lean();

    // Thống kê tháng này và tháng trước
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const reportsThisMonth = await this.reportModel.countDocuments({
      createdAt: { $gte: thisMonthStart },
    });

    const reportsLastMonth = await this.reportModel.countDocuments({
      createdAt: {
        $gte: lastMonthStart,
        $lte: lastMonthEnd,
      },
    });

    // Tính thời gian giải quyết trung bình
    const resolvedReports = await this.reportModel
      .find({
        status: { $in: ['RESOLVED', 'CLOSED'] },
        updatedAt: { $exists: true },
      })
      .select('createdAt updatedAt')
      .lean();

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    resolvedReports.forEach((report: any) => {
      if (report.updatedAt) {
        const resolutionTime =
          (new Date(report.updatedAt).getTime() -
            new Date(report.createdAt).getTime()) /
          (1000 * 60 * 60 * 24); // Convert to days
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    });

    const averageResolutionTime =
      resolvedCount > 0 ? Math.round(totalResolutionTime / resolvedCount) : 0;

    const result = {
      message: 'Lấy thống kê báo cáo thành công',
      data: {
        totalReports,
        reportsByStatus: statusStats,
        reportsByType: typeStats,
        reportsByPriority: priorityStats,
        recentReports,
        reportsThisMonth,
        reportsLastMonth,
        averageResolutionTime,
      },
    };

    // Cache for 15 minutes
    await this.redisService.setCached(key, result, 15 * 60 * 1000);

    return result;
  }

  /**
   * Get time series statistics for reports
   */
  async getTimeSeriesStatistics(
    type: 'daily' | 'weekly' | 'monthly',
    startDate?: string,
    endDate?: string,
    status?: string,
    cacheKey?: string,
  ): Promise<{
    message: string;
    data: Array<{
      date: string;
      total: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
      byPriority: Record<string, number>;
    }>;
  }> {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now);

    // Calculate date range
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default: last 30 days for daily, last 12 weeks for weekly, last 12 months for monthly
      if (type === 'daily') {
        start = new Date(now);
        start.setDate(start.getDate() - 30);
      } else if (type === 'weekly') {
        start = new Date(now);
        start.setDate(start.getDate() - 84); // 12 weeks
      } else {
        // monthly
        start = new Date(now);
        start.setMonth(start.getMonth() - 12);
      }
    }

    // Build match filter
    const matchFilter: any = {
      createdAt: { $gte: start, $lte: end },
    };
    if (status) {
      matchFilter.status = status;
    }

    // Build group by date format
    let dateFormat: any;
    if (type === 'daily') {
      dateFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
      };
    } else if (type === 'weekly') {
      dateFormat = {
        year: { $year: '$createdAt' },
        week: { $week: '$createdAt' },
      };
    } else {
      // monthly
      dateFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
      };
    }

    const pipeline: any[] = [
      { $match: matchFilter },
      {
        $group: {
          _id: dateFormat,
          total: { $sum: 1 },
          statuses: { $push: '$status' },
          types: { $push: '$type' },
          priorities: { $push: '$priority' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
    ];

    const results = await this.reportModel.aggregate(pipeline);

    // Format results
    const formattedResults = results.map((result) => {
      let dateStr: string;
      if (type === 'daily') {
        dateStr = `${result._id.year}-${String(result._id.month).padStart(2, '0')}-${String(result._id.day).padStart(2, '0')}`;
      } else if (type === 'weekly') {
        dateStr = `${result._id.year}-W${String(result._id.week).padStart(2, '0')}`;
      } else {
        dateStr = `${result._id.year}-${String(result._id.month).padStart(2, '0')}`;
      }

      // Count by status
      const byStatus: Record<string, number> = {};
      result.statuses.forEach((s: string) => {
        byStatus[s] = (byStatus[s] || 0) + 1;
      });

      // Count by type
      const byType: Record<string, number> = {};
      result.types.forEach((t: string) => {
        byType[t] = (byType[t] || 0) + 1;
      });

      // Count by priority
      const byPriority: Record<string, number> = {};
      result.priorities.forEach((p: string) => {
        if (p) {
          byPriority[p] = (byPriority[p] || 0) + 1;
        }
      });

      return {
        date: dateStr,
        total: result.total,
        byStatus,
        byType,
        byPriority,
      };
    });

    const key =
      cacheKey ||
      this.redisService.buildCacheKey('/api/report/statistics/time-series', {
        type,
        startDate,
        endDate,
        status,
      });

    // Try to get from cache
    const cached = await this.redisService.getCached<any>(key);
    if (cached) {
      return cached;
    }

    const result = {
      message: 'Lấy thống kê time series thành công',
      data: formattedResults,
    };

    // Cache for 15 minutes
    await this.redisService.setCached(key, result, 15 * 60 * 1000);

    return result;
  }

  /**
   * Get statistics by location (campus/building/area/zone)
   */
  async getStatisticsByLocation(
    groupBy: 'campus' | 'building' | 'area' | 'zone',
    startDate?: string,
    endDate?: string,
    cacheKey?: string,
  ): Promise<{
    message: string;
    data: Array<{
      locationId: string;
      locationName: string;
      total: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
      byPriority: Record<string, number>;
    }>;
  }> {
    const matchFilter: any = {};
    if (startDate && endDate) {
      matchFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Build lookup and group pipeline based on groupBy
    let lookupStage: any;
    let groupStage: any;

    if (groupBy === 'campus') {
      lookupStage = {
        $lookup: {
          from: 'assets',
          localField: 'asset',
          foreignField: '_id',
          as: 'assetData',
        },
      };
      // Need to lookup zone/area -> building -> campus
      // This is complex, simplified version
      groupStage = {
        $group: {
          _id: null, // Simplified - would need complex lookup
          total: { $sum: 1 },
          statuses: { $push: '$status' },
          types: { $push: '$type' },
          priorities: { $push: '$priority' },
        },
      };
    } else {
      // For building/area/zone, we need to lookup through asset
      lookupStage = {
        $lookup: {
          from: 'assets',
          localField: 'asset',
          foreignField: '_id',
          as: 'assetData',
        },
      };
    }

    // Simplified implementation - group by asset location
    const pipeline: any[] = [
      { $match: matchFilter },
      {
        $lookup: {
          from: 'assets',
          localField: 'asset',
          foreignField: '_id',
          as: 'assetData',
        },
      },
      { $unwind: { path: '$assetData', preserveNullAndEmptyArrays: true } },
      // Filter out reports without asset
      {
        $match: {
          assetData: { $exists: true, $ne: null },
        },
      },
    ];

    if (groupBy === 'zone') {
      pipeline.push({
        $lookup: {
          from: 'zones',
          localField: 'assetData.zone',
          foreignField: '_id',
          as: 'zoneData',
        },
      });
      pipeline.push({
        $unwind: { path: '$zoneData', preserveNullAndEmptyArrays: true },
      });
      pipeline.push({
        $group: {
          _id: '$zoneData._id',
          locationName: { $first: '$zoneData.name' },
          total: { $sum: 1 },
          statuses: { $push: '$status' },
          types: { $push: '$type' },
          priorities: { $push: '$priority' },
        },
      });
    } else if (groupBy === 'area') {
      pipeline.push({
        $lookup: {
          from: 'areas',
          localField: 'assetData.area',
          foreignField: '_id',
          as: 'areaData',
        },
      });
      pipeline.push({
        $unwind: { path: '$areaData', preserveNullAndEmptyArrays: true },
      });
      pipeline.push({
        $group: {
          _id: '$areaData._id',
          locationName: { $first: '$areaData.name' },
          total: { $sum: 1 },
          statuses: { $push: '$status' },
          types: { $push: '$type' },
          priorities: { $push: '$priority' },
        },
      });
    } else if (groupBy === 'campus') {
      // Lookup zone -> building -> campus for assets with zone
      pipeline.push({
        $lookup: {
          from: 'zones',
          localField: 'assetData.zone',
          foreignField: '_id',
          as: 'zoneData',
        },
      });
      pipeline.push({
        $unwind: { path: '$zoneData', preserveNullAndEmptyArrays: true },
      });
      pipeline.push({
        $lookup: {
          from: 'buildings',
          localField: 'zoneData.building',
          foreignField: '_id',
          as: 'buildingData',
        },
      });
      pipeline.push({
        $unwind: { path: '$buildingData', preserveNullAndEmptyArrays: true },
      });
      pipeline.push({
        $lookup: {
          from: 'campus',
          localField: 'buildingData.campus',
          foreignField: '_id',
          as: 'campusDataFromZone',
        },
      });
      pipeline.push({
        $unwind: {
          path: '$campusDataFromZone',
          preserveNullAndEmptyArrays: true,
        },
      });
      // Lookup area -> campus for assets with area
      pipeline.push({
        $lookup: {
          from: 'areas',
          localField: 'assetData.area',
          foreignField: '_id',
          as: 'areaData',
        },
      });
      pipeline.push({
        $unwind: { path: '$areaData', preserveNullAndEmptyArrays: true },
      });
      pipeline.push({
        $lookup: {
          from: 'campus',
          localField: 'areaData.campus',
          foreignField: '_id',
          as: 'campusDataFromArea',
        },
      });
      pipeline.push({
        $unwind: {
          path: '$campusDataFromArea',
          preserveNullAndEmptyArrays: true,
        },
      });
      // Determine campus from zone path or area path
      pipeline.push({
        $project: {
          status: 1,
          type: 1,
          priority: 1,
          campusId: {
            $ifNull: ['$campusDataFromZone._id', '$campusDataFromArea._id'],
          },
          campusName: {
            $ifNull: ['$campusDataFromZone.name', '$campusDataFromArea.name'],
          },
        },
      });
      // Filter out documents without campus
      pipeline.push({
        $match: {
          campusId: { $exists: true, $ne: null },
          campusName: { $exists: true, $ne: null },
        },
      });
      pipeline.push({
        $group: {
          _id: '$campusId',
          locationName: { $first: '$campusName' },
          total: { $sum: 1 },
          statuses: { $push: '$status' },
          types: { $push: '$type' },
          priorities: { $push: '$priority' },
        },
      });
    } else if (groupBy === 'building') {
      // Lookup zone -> building
      pipeline.push({
        $lookup: {
          from: 'zones',
          localField: 'assetData.zone',
          foreignField: '_id',
          as: 'zoneData',
        },
      });
      pipeline.push({
        $unwind: { path: '$zoneData', preserveNullAndEmptyArrays: true },
      });
      pipeline.push({
        $lookup: {
          from: 'buildings',
          localField: 'zoneData.building',
          foreignField: '_id',
          as: 'buildingData',
        },
      });
      pipeline.push({
        $unwind: { path: '$buildingData', preserveNullAndEmptyArrays: true },
      });
      pipeline.push({
        $group: {
          _id: '$buildingData._id',
          locationName: { $first: '$buildingData.name' },
          total: { $sum: 1 },
          statuses: { $push: '$status' },
          types: { $push: '$type' },
          priorities: { $push: '$priority' },
        },
      });
    }

    const results = await this.reportModel.aggregate(pipeline);

    // Format results
    const formattedResults = results
      .filter((r) => r._id) // Filter out null locations
      .map((result) => {
        // Count by status
        const byStatus: Record<string, number> = {};
        result.statuses.forEach((s: string) => {
          byStatus[s] = (byStatus[s] || 0) + 1;
        });

        // Count by type
        const byType: Record<string, number> = {};
        result.types.forEach((t: string) => {
          byType[t] = (byType[t] || 0) + 1;
        });

        // Count by priority
        const byPriority: Record<string, number> = {};
        result.priorities.forEach((p: string) => {
          if (p) {
            byPriority[p] = (byPriority[p] || 0) + 1;
          }
        });

        return {
          locationId: result._id.toString(),
          locationName: result.locationName || 'Unknown',
          total: result.total,
          byStatus,
          byType,
          byPriority,
        };
      })
      .sort((a, b) => b.total - a.total);

    const key =
      cacheKey ||
      this.redisService.buildCacheKey('/api/report/statistics/by-location', {
        groupBy,
        startDate,
        endDate,
      });

    // Try to get from cache
    const cached = await this.redisService.getCached<any>(key);
    if (cached) {
      return cached;
    }

    const result = {
      message: `Lấy thống kê theo ${groupBy} thành công`,
      data: formattedResults,
    };

    // Cache for 15 minutes
    await this.redisService.setCached(key, result, 15 * 60 * 1000);

    return result;
  }

  /**
   * Get top assets with most reports
   */
  async getTopAssets(
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    cacheKey?: string,
  ): Promise<{
    message: string;
    data: Array<{
      assetId: string;
      assetName: string;
      assetCode: string;
      totalReports: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
    }>;
  }> {
    const matchFilter: any = {};
    if (startDate && endDate) {
      matchFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const pipeline: any[] = [
      { $match: matchFilter },
      {
        $group: {
          _id: '$asset',
          totalReports: { $sum: 1 },
          statuses: { $push: '$status' },
          types: { $push: '$type' },
        },
      },
      { $sort: { totalReports: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'assets',
          localField: '_id',
          foreignField: '_id',
          as: 'assetData',
        },
      },
      { $unwind: { path: '$assetData', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          assetId: '$_id',
          assetName: '$assetData.name',
          assetCode: '$assetData.code',
          totalReports: 1,
          statuses: 1,
          types: 1,
        },
      },
    ];

    const results = await this.reportModel.aggregate(pipeline);

    const formattedResults = results.map((result) => {
      // Count by status
      const byStatus: Record<string, number> = {};
      result.statuses.forEach((s: string) => {
        byStatus[s] = (byStatus[s] || 0) + 1;
      });

      // Count by type
      const byType: Record<string, number> = {};
      result.types.forEach((t: string) => {
        byType[t] = (byType[t] || 0) + 1;
      });

      return {
        assetId: result.assetId.toString(),
        assetName: result.assetName || 'Unknown',
        assetCode: result.assetCode || 'N/A',
        totalReports: result.totalReports,
        byStatus,
        byType,
      };
    });

    const key =
      cacheKey ||
      this.redisService.buildCacheKey('/api/report/statistics/top-assets', {
        limit,
        startDate,
        endDate,
      });

    // Try to get from cache
    const cached = await this.redisService.getCached<any>(key);
    if (cached) {
      return cached;
    }

    const result = {
      message: 'Lấy top assets thành công',
      data: formattedResults,
    };

    // Cache for 15 minutes
    await this.redisService.setCached(key, result, 15 * 60 * 1000);

    return result;
  }

  /**
   * Get top reporters (users who created most reports)
   */
  async getTopReporters(
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    cacheKey?: string,
  ): Promise<{
    message: string;
    data: Array<{
      userId: string;
      userName: string;
      userEmail: string;
      totalReports: number;
      byType: Record<string, number>;
    }>;
  }> {
    const matchFilter: any = {};
    if (startDate && endDate) {
      matchFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const pipeline: any[] = [
      { $match: matchFilter },
      {
        $group: {
          _id: '$createdBy',
          totalReports: { $sum: 1 },
          types: { $push: '$type' },
        },
      },
      { $sort: { totalReports: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'accounts',
          localField: '_id',
          foreignField: '_id',
          as: 'userData',
        },
      },
      { $unwind: { path: '$userData', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: '$_id',
          userName: '$userData.fullName',
          userEmail: '$userData.email',
          totalReports: 1,
          types: 1,
        },
      },
    ];

    const results = await this.reportModel.aggregate(pipeline);

    const formattedResults = results.map((result) => {
      // Count by type
      const byType: Record<string, number> = {};
      result.types.forEach((t: string) => {
        byType[t] = (byType[t] || 0) + 1;
      });

      return {
        userId: result.userId.toString(),
        userName: result.userName || 'Unknown',
        userEmail: result.userEmail || 'N/A',
        totalReports: result.totalReports,
        byType,
      };
    });

    const key =
      cacheKey ||
      this.redisService.buildCacheKey('/api/report/statistics/top-reporters', {
        limit,
        startDate,
        endDate,
      });

    // Try to get from cache
    const cached = await this.redisService.getCached<any>(key);
    if (cached) {
      return cached;
    }

    const result = {
      message: 'Lấy top reporters thành công',
      data: formattedResults,
    };

    // Cache for 15 minutes
    await this.redisService.setCached(key, result, 15 * 60 * 1000);

    return result;
  }

  /**
   * Get all report types with labels
   */
  async getReportTypes(): Promise<{
    message: string;
    reportTypes: ReportTypeLabel[];
  }> {
    return {
      message: 'Lấy danh sách loại báo cáo thành công',
      reportTypes: REPORT_TYPE_LABELS,
    };
  }

  /**
   * Approve report and create audit log
   */
  async approveReport(
    approveReportDto: ApproveReportDto,
    files?: Express.Multer.File[],
  ): Promise<{
    message: string;
    data: {
      report: any;
      auditLog: any;
    };
  }> {
    const { reportId, staffIds, subject, description, images, expiresAt } =
      approveReportDto;

    // Validate report ID
    if (!Types.ObjectId.isValid(reportId)) {
      throw new NotFoundException('ID báo cáo không hợp lệ');
    }

    // Validate staff IDs
    for (const staffId of staffIds) {
      if (!Types.ObjectId.isValid(staffId)) {
        throw new BadRequestException(`ID nhân viên ${staffId} không hợp lệ`);
      }
    }

    // Start transaction
    const session = await this.reportModel.db.startSession();
    session.startTransaction();

    try {
      // 1. Kiểm tra report tồn tại
      const report = await this.reportModel.findById(reportId).session(session);
      if (!report) {
        throw new NotFoundException('Báo cáo không tồn tại');
      }

      // 2. Kiểm tra trạng thái report
      if (report.status !== ReportStatus.PENDING) {
        throw new BadRequestException(
          `Chỉ có thể phê duyệt báo cáo ở trạng thái PENDING. Trạng thái hiện tại: ${report.status}`,
        );
      }

      // 3. Kiểm tra staffs tồn tại
      const staffObjectIds = staffIds.map((id) => new Types.ObjectId(id));
      const staffs = await this.reportModel.db
        .collection('accounts')
        .find({ _id: { $in: staffObjectIds } })
        .toArray();

      if (staffs.length !== staffIds.length) {
        throw new NotFoundException('Một hoặc nhiều nhân viên không tồn tại');
      }

      // 4. Xử lý upload images nếu có
      let auditImages = images || [];
      if (files && files.length > 0) {
        const imageFiles = files.filter((file) => file.fieldname === 'images');
        if (imageFiles.length > 0) {
          const imageUrls =
            await this.uploadService.uploadMultipleFiles(imageFiles);
          auditImages = [...auditImages, ...imageUrls];
        }
      }

      // 5. Cập nhật trạng thái report từ PENDING → APPROVED
      const updatedReport = await this.reportModel
        .findByIdAndUpdate(
          reportId,
          { status: ReportStatus.APPROVED },
          { new: true, session },
        )
        .populate({
          path: 'asset',
          select: 'name code status zone area image',
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
        .populate('createdBy', 'fullName email');

      // 6. Tạo audit log mới
      const auditLogData: any = {
        report: new Types.ObjectId(reportId),
        status: AuditStatus.PENDING,
        subject,
        description,
        staffs: staffObjectIds,
        images: auditImages,
      };

      // Tính expiresAt: ưu tiên từ DTO, nếu không có thì dùng suggestedProcessingDays từ report
      if (expiresAt) {
        // Nếu có expiresAt từ DTO, dùng nó
        auditLogData.expiresAt = new Date(expiresAt);
      } else if (report.suggestedProcessingDays) {
        // Nếu không có từ DTO, tự động tính từ suggestedProcessingDays
        const approvalDate = new Date();
        const expirationDate = new Date(approvalDate);
        expirationDate.setDate(
          expirationDate.getDate() + report.suggestedProcessingDays,
        );
        auditLogData.expiresAt = expirationDate;
        this.logger.log(
          `Auto-calculated expiresAt: ${expirationDate.toISOString()} (${report.suggestedProcessingDays} days from approval)`,
        );
      }

      const newAuditLog = new this.auditLogModel(auditLogData);

      const savedAuditLog = await newAuditLog.save({ session });
      await savedAuditLog.populate([
        {
          path: 'report',
          select: 'type status description images asset',
          populate: {
            path: 'asset',
            select: 'name code status',
          },
        },
        { path: 'staffs', select: 'fullName email' },
      ]);

      // 7. Commit transaction
      await session.commitTransaction();

      // 8. Send email notification to reporter
      if (updatedReport && updatedReport.createdBy) {
        const reporter = updatedReport.createdBy as any;
        const reporterEmail = reporter.email;
        const reporterName = reporter.fullName || reporterEmail;

        if (reporterEmail) {
          try {
            await this.mailerService.sendMail({
              to: reporterEmail,
              subject:
                'Báo cáo đã được phê duyệt - IUH Infrastructure Management',
              template: 'report-approved',
              context: {
                reporterName,
                reportId: updatedReport._id.toString(),
                reportType:
                  REPORT_TYPE_LABELS.find(
                    (label) => label.value === updatedReport.type,
                  )?.label || updatedReport.type,
                description: updatedReport.description,
                assetName: (updatedReport.asset as any)?.name,
                assetCode: (updatedReport.asset as any)?.code,
                approvedAt: new Date().toLocaleString('vi-VN'),
              },
            });
            this.logger.log(
              `Approved email sent to ${reporterEmail} for report ${reportId}`,
            );
          } catch (error: any) {
            this.logger.error(
              `Failed to send approved email to ${reporterEmail}: ${error.message}`,
            );
            // Don't throw error, just log it
          }
        }
      }

      // 9. Send WebSocket notifications to assigned staffs
      for (const staffId of staffIds) {
        this.eventsService.sendNotificationToUser(staffId, {
          title: 'Nhiệm vụ kiểm tra mới',
          message: `Bạn đã được giao nhiệm vụ: ${subject}`,
          type: 'info',
          data: {
            auditLogId: savedAuditLog._id.toString(),
            subject,
            status: savedAuditLog.status,
            reportId,
          },
        });
      }

      // 10. Emit update event to all clients
      this.eventsService.emitUpdate({
        entity: 'auditlog',
        action: 'created',
        data: {
          _id: savedAuditLog._id,
          subject: savedAuditLog.subject,
          status: savedAuditLog.status,
          staffs: staffIds,
        },
      });

      this.logger.log(
        `Report approved and audit log notifications sent to ${staffIds.length} staff(s)`,
      );

      return {
        message: 'Phê duyệt báo cáo và tạo bản ghi kiểm tra thành công',
        data: {
          report: updatedReport,
          auditLog: savedAuditLog,
        },
      };
    } catch (error) {
      // Rollback transaction nếu có lỗi
      await session.abortTransaction();
      throw error;
    } finally {
      // End session
      await session.endSession();
    }
  }
}
