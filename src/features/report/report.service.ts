import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Report, type ReportDocument } from './schema/report.schema';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { QueryReportDto } from './dto/query-report.dto';
import { UploadService } from '../../shared/upload/upload.service';

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    private readonly uploadService: UploadService,
  ) {}

  async createReport(
    createReportDto: CreateReportDto,
    createdBy: string,
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
    // Kiểm tra asset có tồn tại không
    const asset = await this.reportModel.db
      .collection('assets')
      .findOne({ _id: new Types.ObjectId(createReportDto.asset) });
    if (!asset) {
      throw new NotFoundException('Asset không tồn tại');
    }

    const newReport = new this.reportModel({
      ...createReportDto,
      asset: new Types.ObjectId(createReportDto.asset),
      createdBy: new Types.ObjectId(createdBy),
    });

    const savedReport = await newReport.save();
    await savedReport.populate([
      { path: 'asset', select: 'name code status' },
      { path: 'createdBy', select: 'fullName email username' },
    ]);

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

    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [reports, total] = await Promise.all([
      this.reportModel
        .find(filter)
        .populate('asset', 'name code status')
        .populate('createdBy', 'fullName email username')
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
      .populate('asset', 'name code status')
      .populate('createdBy', 'fullName email username')
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
      .populate('createdBy', 'fullName email username');

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

    return {
      message: 'Xóa báo cáo thành công',
    };
  }
}
