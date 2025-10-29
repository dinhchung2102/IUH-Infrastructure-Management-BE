import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, type AuditLogDocument } from './schema/auditlog.schema';
import { CreateAuditLogDto } from './dto/create-auditlog.dto';
import { UpdateAuditLogDto } from './dto/update-auditlog.dto';
import { QueryAuditLogDto } from './dto/query-auditlog.dto';
import { StaffAuditLogDto, TimeRange } from './dto/staff-auditlog.dto';
import { UploadService } from '../../shared/upload/upload.service';
import { AuditStatus } from './enum/AuditStatus.enum';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    private readonly uploadService: UploadService,
  ) {}

  async createAuditLog(
    createAuditLogDto: CreateAuditLogDto,
    files?: Express.Multer.File[],
  ): Promise<{
    message: string;
    auditLog: any;
  }> {
    // Xử lý upload files nếu có
    let auditImages = createAuditLogDto.images || [];
    if (files && files.length > 0) {
      const imageFiles = files.filter((file) => file.fieldname === 'images');
      if (imageFiles.length > 0) {
        const imageUrls =
          await this.uploadService.uploadMultipleFiles(imageFiles);
        auditImages = [...auditImages, ...imageUrls];
      }
    }

    // Kiểm tra report có tồn tại không
    const report = await this.auditLogModel.db
      .collection('reports')
      .findOne({ _id: new Types.ObjectId(createAuditLogDto.report) });
    if (!report) {
      throw new NotFoundException('Báo cáo không tồn tại');
    }

    // Kiểm tra staffs tồn tại
    const staffObjectIds = createAuditLogDto.staffs.map(
      (id) => new Types.ObjectId(id),
    );
    const staffs = await this.auditLogModel.db
      .collection('accounts')
      .find({ _id: { $in: staffObjectIds } })
      .toArray();

    if (staffs.length !== createAuditLogDto.staffs.length) {
      throw new NotFoundException('Một hoặc nhiều nhân viên không tồn tại');
    }

    const newAuditLog = new this.auditLogModel({
      report: new Types.ObjectId(createAuditLogDto.report),
      status: createAuditLogDto.status,
      subject: createAuditLogDto.subject,
      description: createAuditLogDto.description,
      staffs: staffObjectIds,
      images: auditImages,
    });

    const savedAuditLog = await newAuditLog.save();
    await savedAuditLog.populate([
      {
        path: 'report',
        select: 'type status description asset',
        populate: {
          path: 'asset',
          select: 'name code status',
        },
      },
      { path: 'staffs', select: 'fullName email' },
    ]);

    return {
      message: 'Tạo bản ghi kiểm tra thành công',
      auditLog: savedAuditLog,
    };
  }

  async findAllAuditLogs(queryDto: QueryAuditLogDto): Promise<{
    message: string;
    auditLogs: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  }> {
    const {
      search,
      status,
      report,
      staff,
      zone,
      area,
      building,
      campus,
      startDate,
      endDate,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100); // Max 100
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {};

    // ===== Basic Filters =====
    if (status) {
      filter.status = status;
    }
    if (report) {
      filter.report = new Types.ObjectId(report);
    }
    if (staff) {
      filter.staffs = new Types.ObjectId(staff);
    }

    // ===== Date Range Filter =====
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999); // End of day
        dateFilter.$lte = endDateTime;
      }
      filter.createdAt = dateFilter;
    }

    // ===== Location Filters (via report → asset) =====
    if (zone || area || building || campus) {
      // Tìm reports có asset thuộc location
      const assetFilter: Record<string, any> = {};
      if (zone) assetFilter.zone = new Types.ObjectId(zone);
      if (area) assetFilter.area = new Types.ObjectId(area);

      const matchingAssets = await this.auditLogModel.db
        .collection('assets')
        .find(assetFilter)
        .project({ _id: 1 })
        .toArray();

      const assetIds = matchingAssets.map((a) => a._id);

      // Tìm reports có asset trong list
      const matchingReports = await this.auditLogModel.db
        .collection('reports')
        .find({ asset: { $in: assetIds } })
        .project({ _id: 1 })
        .toArray();

      const reportIds = matchingReports.map((r) => r._id);
      filter.report = { $in: reportIds };

      // Filter by building hoặc campus (via zone/area → building → campus)
      if (building || campus) {
        const buildingFilter: Record<string, any> = {};
        if (building) buildingFilter._id = new Types.ObjectId(building);
        if (campus) buildingFilter.campus = new Types.ObjectId(campus);

        const matchingBuildings = await this.auditLogModel.db
          .collection('buildings')
          .find(buildingFilter)
          .project({ _id: 1 })
          .toArray();

        const buildingIds = matchingBuildings.map((b) => b._id);

        // Tìm zones/areas thuộc buildings
        const matchingZones = await this.auditLogModel.db
          .collection('zones')
          .find({ building: { $in: buildingIds } })
          .project({ _id: 1 })
          .toArray();

        const matchingAreas = await this.auditLogModel.db
          .collection('areas')
          .find({ building: { $in: buildingIds } })
          .project({ _id: 1 })
          .toArray();

        const zoneIds = matchingZones.map((z) => z._id);
        const areaIds = matchingAreas.map((a) => a._id);

        // Tìm assets thuộc zones/areas
        const finalAssets = await this.auditLogModel.db
          .collection('assets')
          .find({
            $or: [{ zone: { $in: zoneIds } }, { area: { $in: areaIds } }],
          })
          .project({ _id: 1 })
          .toArray();

        const finalAssetIds = finalAssets.map((a) => a._id);

        // Tìm reports cuối cùng
        const finalReports = await this.auditLogModel.db
          .collection('reports')
          .find({ asset: { $in: finalAssetIds } })
          .project({ _id: 1 })
          .toArray();

        const finalReportIds = finalReports.map((r) => r._id);
        filter.report = { $in: finalReportIds };
      }
    }

    // ===== Advanced Search =====
    if (search) {
      // Search trong audit log (subject, description)
      // + trong report (type)
      // + trong asset (name, code)
      const searchLower = search.toLowerCase();
      const auditLogs = await this.auditLogModel
        .find()
        .populate({
          path: 'report',
          populate: {
            path: 'asset',
          },
        })
        .lean();

      const matchingIds = auditLogs
        .filter((log: any) => {
          const subjectMatch = log.subject?.toLowerCase().includes(searchLower);
          const descMatch = log.description
            ?.toLowerCase()
            .includes(searchLower);
          const reportTypeMatch = log.report?.type
            ?.toLowerCase()
            .includes(searchLower);
          const assetNameMatch = log.report?.asset?.name
            ?.toLowerCase()
            .includes(searchLower);
          const assetCodeMatch = log.report?.asset?.code
            ?.toLowerCase()
            .includes(searchLower);

          return (
            subjectMatch ||
            descMatch ||
            reportTypeMatch ||
            assetNameMatch ||
            assetCodeMatch
          );
        })
        .map((log: any) => log._id);

      filter._id = { $in: matchingIds };
    }

    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [auditLogs, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .populate({
          path: 'report',
          select: 'type status description asset images createdBy',
          populate: [
            {
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
            },
            {
              path: 'createdBy',
              select: 'fullName email',
            },
          ],
        })
        .populate('staffs', 'fullName email')
        .populate('acceptedBy', 'fullName email')
        .populate('completedBy', 'fullName email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.auditLogModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return {
      message: 'Lấy danh sách bản ghi kiểm tra thành công',
      auditLogs,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
      },
    };
  }

  async findOneAuditLog(id: string): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('ID bản ghi kiểm tra không hợp lệ');
    }

    const auditLog = await this.auditLogModel
      .findById(id)
      .populate({
        path: 'report',
        select: 'type status description asset images createdBy',
        populate: [
          {
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
          },
          {
            path: 'createdBy',
            select: 'fullName email',
          },
        ],
      })
      .populate('staffs', 'fullName email')
      .populate('acceptedBy', 'fullName email')
      .populate('completedBy', 'fullName email')
      .lean();

    if (!auditLog) {
      throw new NotFoundException('Bản ghi kiểm tra không tồn tại');
    }

    return {
      message: 'Lấy thông tin bản ghi kiểm tra thành công',
      data: auditLog,
    };
  }

  async updateAuditLog(
    id: string,
    updateAuditLogDto: UpdateAuditLogDto,
  ): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('ID bản ghi kiểm tra không hợp lệ');
    }

    const existingAuditLog = await this.auditLogModel.findById(id);
    if (!existingAuditLog) {
      throw new NotFoundException('Bản ghi kiểm tra không tồn tại');
    }

    // Kiểm tra report có tồn tại không (nếu có thay đổi)
    if (updateAuditLogDto.report) {
      const report = await this.auditLogModel.db
        .collection('reports')
        .findOne({ _id: new Types.ObjectId(updateAuditLogDto.report) });
      if (!report) {
        throw new NotFoundException('Báo cáo không tồn tại');
      }
    }

    // Kiểm tra staffs tồn tại (nếu có thay đổi)
    if (updateAuditLogDto.staffs && updateAuditLogDto.staffs.length > 0) {
      const staffObjectIds = updateAuditLogDto.staffs.map(
        (id) => new Types.ObjectId(id),
      );
      const staffs = await this.auditLogModel.db
        .collection('accounts')
        .find({ _id: { $in: staffObjectIds } })
        .toArray();

      if (staffs.length !== updateAuditLogDto.staffs.length) {
        throw new NotFoundException('Một hoặc nhiều nhân viên không tồn tại');
      }
    }

    const updateData: Record<string, any> = { ...updateAuditLogDto };
    if (updateAuditLogDto.report) {
      updateData.report = new Types.ObjectId(updateAuditLogDto.report);
    }
    if (updateAuditLogDto.staffs) {
      updateData.staffs = updateAuditLogDto.staffs.map(
        (id) => new Types.ObjectId(id),
      );
    }

    const updatedAuditLog = await this.auditLogModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate({
        path: 'report',
        select: 'type status description asset images',
        populate: {
          path: 'asset',
          select: 'name code status',
        },
      })
      .populate('staffs', 'fullName email')
      .populate('acceptedBy', 'fullName email')
      .populate('completedBy', 'fullName email');

    return {
      message: 'Cập nhật bản ghi kiểm tra thành công',
      data: updatedAuditLog,
    };
  }

  async removeAuditLog(id: string): Promise<{
    message: string;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('ID bản ghi kiểm tra không hợp lệ');
    }

    const auditLog = await this.auditLogModel.findById(id);
    if (!auditLog) {
      throw new NotFoundException('Bản ghi kiểm tra không tồn tại');
    }

    await this.auditLogModel.findByIdAndDelete(id);

    return {
      message: 'Xóa bản ghi kiểm tra thành công',
    };
  }

  async getStaffAuditLogs(
    staffId: string,
    queryDto: StaffAuditLogDto,
  ): Promise<{
    message: string;
    auditLogs: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
    timeRange: {
      type: TimeRange;
      startDate: Date;
      endDate: Date;
    };
  }> {
    const {
      timeRange = TimeRange.DAY,
      status,
      date,
      week,
      year,
      month,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const skip = (pageNum - 1) * limitNum;

    // Calculate date range based on timeRange
    let startDate: Date;
    let endDate: Date;

    switch (timeRange) {
      case TimeRange.DAY: {
        if (!date) {
          throw new NotFoundException(
            'Ngày không được để trống khi chọn loại ngày',
          );
        }
        startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        break;
      }

      case TimeRange.WEEK: {
        if (!week || !year) {
          throw new NotFoundException(
            'Tuần và năm không được để trống khi chọn loại tuần',
          );
        }
        const weekNum = typeof week === 'string' ? parseInt(week, 10) : week;
        const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;

        // Calculate start of week (Monday)
        const jan1 = new Date(yearNum, 0, 1);
        const daysToFirstMonday = (8 - jan1.getDay()) % 7;
        const firstMonday = new Date(jan1);
        firstMonday.setDate(jan1.getDate() + daysToFirstMonday);

        startDate = new Date(firstMonday);
        startDate.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      }

      case TimeRange.MONTH: {
        if (!month || !year) {
          throw new NotFoundException(
            'Tháng và năm không được để trống khi chọn loại tháng',
          );
        }
        const monthNum =
          typeof month === 'string' ? parseInt(month, 10) : month;
        const monthYear = typeof year === 'string' ? parseInt(year, 10) : year;

        startDate = new Date(monthYear, monthNum - 1, 1);
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(monthYear, monthNum, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      }

      default:
        throw new NotFoundException('Loại thời gian không hợp lệ');
    }

    // Build filter for staff audit logs
    const filter: Record<string, any> = {
      staffs: new Types.ObjectId(staffId),
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    // Add status filter if provided
    if (status) {
      filter.status = status;
    }

    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [auditLogs, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .populate({
          path: 'report',
          select: 'type status description asset images createdBy',
          populate: [
            {
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
            },
            {
              path: 'createdBy',
              select: 'fullName email',
            },
          ],
        })
        .populate('staffs', 'fullName email')
        .populate('acceptedBy', 'fullName email')
        .populate('completedBy', 'fullName email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.auditLogModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return {
      message: 'Lấy danh sách bản ghi kiểm tra của nhân viên thành công',
      auditLogs,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
      },
      timeRange: {
        type: timeRange,
        startDate,
        endDate,
      },
    };
  }

  async acceptAuditLog(
    auditId: string,
    staffId: string,
  ): Promise<{
    message: string;
    data: any;
  }> {
    // Validate auditId format
    if (!Types.ObjectId.isValid(auditId)) {
      throw new BadRequestException('ID bản ghi kiểm tra không hợp lệ');
    }

    // Validate staffId format
    if (!Types.ObjectId.isValid(staffId)) {
      throw new BadRequestException('ID nhân viên không hợp lệ');
    }

    // Find audit log
    const auditLog = await this.auditLogModel.findById(auditId);
    if (!auditLog) {
      throw new NotFoundException('Bản ghi kiểm tra không tồn tại');
    }

    // Check if staff is in the staffs list
    const staffObjectId = new Types.ObjectId(staffId);
    const isStaffInList = auditLog.staffs.some((staff) => {
      const staffIdStr =
        staff instanceof Types.ObjectId
          ? staff.toString()
          : (staff as any)._id?.toString() || String(staff);
      return staffIdStr === staffObjectId.toString();
    });

    if (!isStaffInList) {
      throw new ForbiddenException(
        'Bạn không có quyền xác nhận bản ghi kiểm tra này',
      );
    }

    // Check if audit log is in PENDING status
    if (auditLog.status !== AuditStatus.PENDING) {
      throw new BadRequestException(
        'Chỉ có thể xác nhận bản ghi kiểm tra đang ở trạng thái PENDING',
      );
    }

    // Update status to IN_PROGRESS and set acceptedAt, acceptedBy
    const updatedAuditLog = await this.auditLogModel
      .findByIdAndUpdate(
        auditId,
        {
          status: AuditStatus.IN_PROGRESS,
          acceptedAt: new Date(),
          acceptedBy: staffObjectId,
        },
        { new: true },
      )
      .populate({
        path: 'report',
        select: 'type status description asset images createdBy',
        populate: {
          path: 'asset',
          select: 'name code status',
        },
      })
      .populate('staffs', 'fullName email')
      .populate('acceptedBy', 'fullName email');

    return {
      message: 'Xác nhận thực hiện bản ghi kiểm tra thành công',
      data: updatedAuditLog,
    };
  }

  async completeAuditLog(
    auditId: string,
    staffId: string,
    notes?: string,
    files?: Express.Multer.File[],
  ): Promise<{
    message: string;
    data: any;
  }> {
    // Validate auditId format
    if (!Types.ObjectId.isValid(auditId)) {
      throw new BadRequestException('ID bản ghi kiểm tra không hợp lệ');
    }

    // Validate staffId format
    if (!Types.ObjectId.isValid(staffId)) {
      throw new BadRequestException('ID nhân viên không hợp lệ');
    }

    // Find audit log
    const auditLog = await this.auditLogModel.findById(auditId);
    if (!auditLog) {
      throw new NotFoundException('Bản ghi kiểm tra không tồn tại');
    }

    // Check if staff is in the staffs list
    const staffObjectId = new Types.ObjectId(staffId);
    const isStaffInList = auditLog.staffs.some((staff) => {
      const staffIdStr =
        staff instanceof Types.ObjectId
          ? staff.toString()
          : (staff as any)._id?.toString() || String(staff);
      return staffIdStr === staffObjectId.toString();
    });

    if (!isStaffInList) {
      throw new ForbiddenException(
        'Bạn không có quyền hoàn thành bản ghi kiểm tra này',
      );
    }

    // Check if audit log is in IN_PROGRESS status
    if (auditLog.status !== AuditStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Chỉ có thể hoàn thành bản ghi kiểm tra đang ở trạng thái IN_PROGRESS',
      );
    }

    // Upload images if provided
    let newImageUrls: string[] = [];
    if (files && files.length > 0) {
      newImageUrls = await this.uploadService.uploadMultipleFiles(files);
    }

    // Merge existing images with new images
    const allImages = [...auditLog.images, ...newImageUrls];

    // Update status to COMPLETED and set completedAt, completedBy, notes
    const updatedAuditLog = await this.auditLogModel
      .findByIdAndUpdate(
        auditId,
        {
          status: AuditStatus.COMPLETED,
          completedAt: new Date(),
          completedBy: staffObjectId,
          images: allImages,
          notes: notes || undefined,
        },
        { new: true },
      )
      .populate({
        path: 'report',
        select: 'type status description asset images createdBy',
        populate: {
          path: 'asset',
          select: 'name code status',
        },
      })
      .populate('staffs', 'fullName email')
      .populate('acceptedBy', 'fullName email')
      .populate('completedBy', 'fullName email');

    return {
      message: 'Hoàn thành bản ghi kiểm tra thành công',
      data: updatedAuditLog,
    };
  }
}
