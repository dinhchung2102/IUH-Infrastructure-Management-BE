import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Campus, CampusDocument } from './schema/campus.schema';
import { Model, Types } from 'mongoose';
import { CreateCampusDto, UpdateCampusDto, QueryCampusDto } from './dto';

@Injectable()
export class CampusService {
  constructor(
    @InjectModel(Campus.name) private campusModel: Model<CampusDocument>,
  ) {}

  async create(createCampusDto: CreateCampusDto) {
    // Kiểm tra tên campus đã tồn tại chưa
    const existingCampus = await this.campusModel.findOne({
      name: createCampusDto.name,
    });

    if (existingCampus) {
      throw new ConflictException('Tên campus đã tồn tại');
    }

    // Kiểm tra email đã tồn tại chưa
    const existingEmail = await this.campusModel.findOne({
      email: createCampusDto.email,
    });

    if (existingEmail) {
      throw new ConflictException('Email campus đã tồn tại');
    }

    // Kiểm tra phone đã tồn tại chưa
    const existingPhone = await this.campusModel.findOne({
      phone: createCampusDto.phone,
    });

    if (existingPhone) {
      throw new ConflictException('Số điện thoại campus đã tồn tại');
    }

    const newCampus = new this.campusModel({
      ...createCampusDto,
      manager: new Types.ObjectId(createCampusDto.manager),
    });

    const savedCampus = await newCampus.save();
    await savedCampus.populate('manager', 'fullName email');

    return {
      message: 'Tạo campus thành công',
      data: savedCampus,
    };
  }

  async findAll(queryDto: QueryCampusDto): Promise<{
    message: string;
    campuses: any[];
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
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Xây dựng filter
    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    // Xây dựng sort
    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Thực hiện query
    const [campuses, total] = await Promise.all([
      this.campusModel
        .find(filter)
        .populate('manager', 'fullName email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.campusModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return {
      message: 'Lấy danh sách campus thành công',
      campuses,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
      },
    };
  }

  async findOne(id: string): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID campus không hợp lệ');
    }

    const campus = await this.campusModel
      .findById(id)
      .populate('manager', 'fullName email phoneNumber')
      .lean();

    if (!campus) {
      throw new NotFoundException('Campus không tồn tại');
    }

    return {
      message: 'Lấy thông tin campus thành công',
      data: campus,
    };
  }

  async update(id: string, updateCampusDto: UpdateCampusDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID campus không hợp lệ');
    }

    const existingCampus = await this.campusModel.findById(id);
    if (!existingCampus) {
      throw new NotFoundException('Campus không tồn tại');
    }

    // Convert to plain object for easier access
    const updateData = updateCampusDto as Record<string, any>;

    // Kiểm tra tên campus đã tồn tại chưa (nếu có thay đổi)
    if (updateData.name && updateData.name !== existingCampus.name) {
      const duplicateName = await this.campusModel.findOne({
        name: updateData.name,
        _id: { $ne: id },
      });

      if (duplicateName) {
        throw new ConflictException('Tên campus đã tồn tại');
      }
    }

    // Kiểm tra email đã tồn tại chưa (nếu có thay đổi)
    if (updateData.email && updateData.email !== existingCampus.email) {
      const duplicateEmail = await this.campusModel.findOne({
        email: updateData.email,
        _id: { $ne: id },
      });

      if (duplicateEmail) {
        throw new ConflictException('Email campus đã tồn tại');
      }
    }

    // Kiểm tra phone đã tồn tại chưa (nếu có thay đổi)
    if (updateData.phone && updateData.phone !== existingCampus.phone) {
      const duplicatePhone = await this.campusModel.findOne({
        phone: updateData.phone,
        _id: { $ne: id },
      });

      if (duplicatePhone) {
        throw new ConflictException('Số điện thoại campus đã tồn tại');
      }
    }

    // Chuẩn bị data update
    const finalUpdateData: Record<string, any> = { ...updateData };
    if (updateData.manager) {
      finalUpdateData.manager = new Types.ObjectId(
        updateData.manager as string,
      );
    }

    const updatedCampus = await this.campusModel
      .findByIdAndUpdate(id, finalUpdateData, { new: true })
      .populate('manager', 'fullName email');

    return {
      message: 'Cập nhật campus thành công',
      data: updatedCampus,
    };
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID campus không hợp lệ');
    }

    const campus = await this.campusModel.findById(id);
    if (!campus) {
      throw new NotFoundException('Campus không tồn tại');
    }

    await this.campusModel.findByIdAndDelete(id);

    return {
      message: 'Xóa campus thành công',
    };
  }

  async getCampusStats() {
    const stats = await this.campusModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalCampuses = await this.campusModel.countDocuments();

    return {
      message: 'Lấy thống kê campus thành công',
      data: {
        total: totalCampuses,
        byStatus: stats,
      },
    };
  }
}
