import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, type AuditLogDocument } from './schema/auditlog.schema';
import { CreateAuditLogDto } from './dto/create-auditlog.dto';
import { UpdateAuditLogDto } from './dto/update-auditlog.dto';
import { QueryAuditLogDto } from './dto/query-auditlog.dto';
import { UploadService } from '../../shared/upload/upload.service';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    private readonly uploadService: UploadService,
  ) {}

  async createAuditLog(
    createAuditLogDto: CreateAuditLogDto,
    staffId: string,
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
        createAuditLogDto.images = imageUrls;
      }
    }
    // Kiểm tra asset có tồn tại không
    const asset = await this.auditLogModel.db
      .collection('assets')
      .findOne({ _id: new Types.ObjectId(createAuditLogDto.asset) });
    if (!asset) {
      throw new NotFoundException('Asset không tồn tại');
    }

    // Kiểm tra report có tồn tại không (nếu có)
    if (createAuditLogDto.report) {
      const report = await this.auditLogModel.db
        .collection('reports')
        .findOne({ _id: new Types.ObjectId(createAuditLogDto.report) });
      if (!report) {
        throw new NotFoundException('Report không tồn tại');
      }
    }

    const newAuditLog = new this.auditLogModel({
      ...createAuditLogDto,
      asset: new Types.ObjectId(createAuditLogDto.asset),
      report: createAuditLogDto.report
        ? new Types.ObjectId(createAuditLogDto.report)
        : undefined,
      staff: new Types.ObjectId(staffId),
    });

    const savedAuditLog = await newAuditLog.save();
    await savedAuditLog.populate([
      { path: 'asset', select: 'name code status' },
      { path: 'report', select: 'type status description' },
      { path: 'staff', select: 'fullName email username' },
    ]);

    return {
      message: 'Tạo bản ghi kiểm tra thành công',
      data: savedAuditLog,
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
      asset,
      status,
      report,
      staff,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {};

    // Tìm kiếm theo tiêu đề, mô tả
    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (asset) {
      filter.asset = new Types.ObjectId(asset);
    }
    if (status) {
      filter.status = status;
    }
    if (report) {
      filter.report = new Types.ObjectId(report);
    }
    if (staff) {
      filter.staff = new Types.ObjectId(staff);
    }

    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [auditLogs, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .populate('asset', 'name code status')
        .populate('report', 'type status description')
        .populate('staff', 'fullName email username')
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
      .populate('asset', 'name code status')
      .populate('report', 'type status description')
      .populate('staff', 'fullName email username')
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

    // Kiểm tra asset có tồn tại không (nếu có thay đổi)
    if (updateAuditLogDto.asset) {
      const asset = await this.auditLogModel.db
        .collection('assets')
        .findOne({ _id: new Types.ObjectId(updateAuditLogDto.asset) });
      if (!asset) {
        throw new NotFoundException('Asset không tồn tại');
      }
    }

    // Kiểm tra report có tồn tại không (nếu có thay đổi)
    if (updateAuditLogDto.report) {
      const report = await this.auditLogModel.db
        .collection('reports')
        .findOne({ _id: new Types.ObjectId(updateAuditLogDto.report) });
      if (!report) {
        throw new NotFoundException('Report không tồn tại');
      }
    }

    const updateData: Record<string, any> = { ...updateAuditLogDto };
    if (updateAuditLogDto.asset) {
      updateData.asset = new Types.ObjectId(updateAuditLogDto.asset);
    }
    if (updateAuditLogDto.report) {
      updateData.report = new Types.ObjectId(updateAuditLogDto.report);
    }

    const updatedAuditLog = await this.auditLogModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('asset', 'name code status')
      .populate('report', 'type status description')
      .populate('staff', 'fullName email username');

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
}
