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
import { QueryReportDto } from './dto/query-report.dto';
import { ApproveReportDto } from './dto/approve-report.dto';
import { UploadService } from '../../shared/upload/upload.service';
import {
  REPORT_TYPE_LABELS,
  type ReportTypeLabel,
} from './config/report-type-labels.config';
import { ReportStatus } from './enum/ReportStatus.enum';
import { RedisService } from '../../shared/redis/redis.service';
import { MailerService } from '@nestjs-modules/mailer';
import { RoleName } from '../auth/enum/role.enum';
import {
  AuditLog,
  type AuditLogDocument,
} from '../audit/schema/auditlog.schema';
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

    // Auto-classify priority using AI if not provided
    let priority = createReportDto.priority;
    if (!priority && this.classificationService) {
      try {
        this.logger.log('AI auto-classifying report priority...');
        const classification = await this.classificationService.classifyReport(
          createReportDto.description,
          asset.name as string, // Use asset name as location context
        );
        priority = classification.priority as any;
        this.logger.log(`AI classified priority: ${priority}`);
      } catch (error) {
        this.logger.warn(
          `Failed to auto-classify priority: ${error.message}. Using default MEDIUM`,
        );
        priority = 'MEDIUM' as any;
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

    return {
      message: 'Tạo báo cáo thành công',
      data: savedReport,
    };
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

  async getReportStatistics(): Promise<{
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

    return {
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
    const { reportId, staffIds, subject, description, images } =
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
      const newAuditLog = new this.auditLogModel({
        report: new Types.ObjectId(reportId),
        status: AuditStatus.PENDING,
        subject,
        description,
        staffs: staffObjectIds,
        images: auditImages,
      });

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

      // 8. Send WebSocket notifications to assigned staffs
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

      // 9. Emit update event to all clients
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
