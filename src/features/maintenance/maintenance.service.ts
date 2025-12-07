import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Maintenance,
  type MaintenanceDocument,
} from './schema/maintenance.schema';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { QueryMaintenanceDto } from './dto/query-maintenance.dto';
import { MaintenanceStatus } from './enum/MaintenanceStatus.enum';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectModel(Maintenance.name)
    private readonly maintenanceModel: Model<MaintenanceDocument>,
  ) {}

  async create(
    createMaintenanceDto: CreateMaintenanceDto,
    createdBy: string,
  ): Promise<{
    message: string;
    data: any;
  }> {
    // Validate asset exists
    const asset = await this.maintenanceModel.db
      .collection('assets')
      .findOne({ _id: new Types.ObjectId(createMaintenanceDto.asset) });
    if (!asset) {
      throw new NotFoundException('Thiết bị không tồn tại');
    }

    // Validate assigned staffs if provided
    if (
      createMaintenanceDto.assignedTo &&
      createMaintenanceDto.assignedTo.length > 0
    ) {
      const staffIds = createMaintenanceDto.assignedTo.map(
        (id) => new Types.ObjectId(id),
      );
      const staffs = await this.maintenanceModel.db
        .collection('accounts')
        .find({ _id: { $in: staffIds } })
        .toArray();
      if (staffs.length !== createMaintenanceDto.assignedTo.length) {
        throw new NotFoundException('Một hoặc nhiều nhân viên không tồn tại');
      }
    }

    const maintenanceData: Record<string, any> = {
      ...createMaintenanceDto,
      asset: new Types.ObjectId(createMaintenanceDto.asset),
      createdBy: new Types.ObjectId(createdBy),
      scheduledDate: new Date(createMaintenanceDto.scheduledDate),
      status: createMaintenanceDto.status || MaintenanceStatus.PENDING,
      priority: createMaintenanceDto.priority || 'MEDIUM',
    };

    if (createMaintenanceDto.assignedTo) {
      maintenanceData.assignedTo = createMaintenanceDto.assignedTo.map(
        (id) => new Types.ObjectId(id),
      );
    }

    const created = await this.maintenanceModel.create(maintenanceData);

    const populated = await this.maintenanceModel
      .findById(created._id)
      .populate('asset', 'name code status')
      .populate('createdBy', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .lean();

    return {
      message: 'Tạo lịch bảo trì thành công',
      data: populated,
    };
  }

  async findAll(query: QueryMaintenanceDto): Promise<{
    message: string;
    data: {
      maintenances: any[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
      };
    };
  }> {
    const {
      search,
      status,
      priority,
      asset,
      assignedTo,
      startDate,
      endDate,
      page = '1',
      limit = '10',
      sortBy = 'scheduledDate',
      sortOrder = 'asc',
    } = query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (asset) filter.asset = new Types.ObjectId(asset);
    if (assignedTo) filter.assignedTo = new Types.ObjectId(assignedTo);

    // Filter by date range (scheduledDate)
    if (startDate || endDate) {
      const dateFilter: Record<string, any> = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      filter.scheduledDate = dateFilter;
    }

    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [maintenances, total] = await Promise.all([
      this.maintenanceModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('asset', 'name code status')
        .populate('createdBy', 'fullName email')
        .populate('assignedTo', 'fullName email')
        .lean(),
      this.maintenanceModel.countDocuments(filter),
    ]);

    return {
      message: 'Lấy danh sách lịch bảo trì thành công',
      data: {
        maintenances,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    };
  }

  async findOne(id: string): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const maintenance = await this.maintenanceModel
      .findById(id)
      .populate('asset', 'name code status zone area')
      .populate('createdBy', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .lean();

    if (!maintenance) {
      throw new NotFoundException('Lịch bảo trì không tồn tại');
    }

    return {
      message: 'Lấy thông tin lịch bảo trì thành công',
      data: maintenance,
    };
  }

  async update(
    id: string,
    updateMaintenanceDto: UpdateMaintenanceDto,
  ): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const existing = await this.maintenanceModel.findById(id);
    if (!existing) {
      throw new NotFoundException('Lịch bảo trì không tồn tại');
    }

    const updateData: Record<string, any> = { ...updateMaintenanceDto };

    // Validate asset if provided
    if (updateMaintenanceDto.asset) {
      const asset = await this.maintenanceModel.db
        .collection('assets')
        .findOne({ _id: new Types.ObjectId(updateMaintenanceDto.asset) });
      if (!asset) {
        throw new NotFoundException('Thiết bị không tồn tại');
      }
      updateData.asset = new Types.ObjectId(updateMaintenanceDto.asset);
    }

    // Validate assigned staffs if provided
    if (updateMaintenanceDto.assignedTo) {
      const staffIds = updateMaintenanceDto.assignedTo.map(
        (id) => new Types.ObjectId(id),
      );
      const staffs = await this.maintenanceModel.db
        .collection('accounts')
        .find({ _id: { $in: staffIds } })
        .toArray();
      if (staffs.length !== updateMaintenanceDto.assignedTo.length) {
        throw new NotFoundException('Một hoặc nhiều nhân viên không tồn tại');
      }
      updateData.assignedTo = staffIds;
    }

    // Handle scheduledDate
    if (updateMaintenanceDto.scheduledDate) {
      updateData.scheduledDate = new Date(updateMaintenanceDto.scheduledDate);
    }

    // Handle completedDate
    if (updateMaintenanceDto.completedDate) {
      updateData.completedDate = new Date(updateMaintenanceDto.completedDate);
      // Auto update status to COMPLETED if completedDate is set
      if (!updateData.status) {
        updateData.status = MaintenanceStatus.COMPLETED;
      }
    }

    // Auto update status to COMPLETED if status is set to COMPLETED
    if (
      updateData.status === MaintenanceStatus.COMPLETED &&
      !updateData.completedDate
    ) {
      updateData.completedDate = new Date();
    }

    const updated = await this.maintenanceModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('asset', 'name code status')
      .populate('createdBy', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .lean();

    return {
      message: 'Cập nhật lịch bảo trì thành công',
      data: updated,
    };
  }

  async remove(id: string): Promise<{
    message: string;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const existing = await this.maintenanceModel.findById(id);
    if (!existing) {
      throw new NotFoundException('Lịch bảo trì không tồn tại');
    }

    await this.maintenanceModel.findByIdAndDelete(id);

    return {
      message: 'Xóa lịch bảo trì thành công',
    };
  }

  /**
   * Get overdue maintenances (scheduledDate < today and status is PENDING or IN_PROGRESS)
   */
  async getOverdueMaintenances(): Promise<{
    message: string;
    data: any[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = await this.maintenanceModel
      .find({
        scheduledDate: { $lt: today },
        status: {
          $in: [MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS],
        },
      })
      .populate('asset', 'name code status')
      .populate('createdBy', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .sort({ scheduledDate: 1 })
      .lean();

    // Update status to OVERDUE
    if (overdue.length > 0) {
      const ids = overdue.map((item) => item._id);
      await this.maintenanceModel.updateMany(
        { _id: { $in: ids } },
        { $set: { status: MaintenanceStatus.OVERDUE } },
      );
    }

    return {
      message: 'Lấy danh sách lịch bảo trì quá hạn thành công',
      data: overdue,
    };
  }

  /**
   * Get upcoming maintenances (scheduledDate within next N days)
   */
  async getUpcomingMaintenances(days: number = 7): Promise<{
    message: string;
    data: any[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    futureDate.setHours(23, 59, 59, 999);

    const upcoming = await this.maintenanceModel
      .find({
        scheduledDate: { $gte: today, $lte: futureDate },
        status: {
          $in: [MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS],
        },
      })
      .populate('asset', 'name code status')
      .populate('createdBy', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .sort({ scheduledDate: 1 })
      .lean();

    return {
      message: `Lấy danh sách lịch bảo trì sắp tới (${days} ngày) thành công`,
      data: upcoming,
    };
  }
}
