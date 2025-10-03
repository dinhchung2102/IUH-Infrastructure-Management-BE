import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Area, AreaDocument } from './schema/area.schema';
import { Building, BuildingDocument } from './schema/building.schema';
import { Zone, ZoneDocument } from './schema/zone.schema';
import { Campus, CampusDocument } from '../campus/schema/campus.schema';
import {
  CreateAreaDto,
  UpdateAreaDto,
  QueryAreaDto,
  CreateBuildingDto,
  UpdateBuildingDto,
  QueryBuildingDto,
  CreateZoneDto,
  UpdateZoneDto,
  QueryZoneDto,
} from './dto';

@Injectable()
export class ZoneAreaMainService {
  constructor(
    @InjectModel(Area.name) private areaModel: Model<AreaDocument>,
    @InjectModel(Building.name) private buildingModel: Model<BuildingDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    @InjectModel(Campus.name) private campusModel: Model<CampusDocument>,
  ) {}

  // ==================== AREA METHODS ====================

  async createArea(createAreaDto: CreateAreaDto) {
    // Kiểm tra tên area đã tồn tại chưa
    const existingArea = await this.areaModel.findOne({
      name: createAreaDto.name,
    });

    if (existingArea) {
      throw new ConflictException('Tên khu vực đã tồn tại');
    }

    // Kiểm tra campus có tồn tại không
    const campus = await this.campusModel.findById(createAreaDto.campus);
    if (!campus) {
      throw new NotFoundException('Campus không tồn tại');
    }

    const newArea = new this.areaModel({
      ...createAreaDto,
      campus: new Types.ObjectId(createAreaDto.campus),
    });

    const savedArea = await newArea.save();
    await savedArea.populate('campus', 'name address');

    return {
      message: 'Tạo khu vực thành công',
      data: savedArea,
    };
  }

  async findAllAreas(queryDto: QueryAreaDto): Promise<{
    message: string;
    data: {
      areas: any[];
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
      campus,
      zoneType,
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
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (campus) {
      filter.campus = new Types.ObjectId(campus);
    }

    if (zoneType) {
      filter.zoneType = zoneType;
    }

    // Xây dựng sort
    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Thực hiện query
    const [areas, total] = await Promise.all([
      this.areaModel
        .find(filter)
        .populate('campus', 'name address')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.areaModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return {
      message: 'Lấy danh sách khu vực thành công',
      data: {
        areas,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    };
  }

  async findOneArea(id: string): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID khu vực không hợp lệ');
    }

    const area = await this.areaModel
      .findById(id)
      .populate('campus', 'name address phone email')
      .lean();

    if (!area) {
      throw new NotFoundException('Khu vực không tồn tại');
    }

    return {
      message: 'Lấy thông tin khu vực thành công',
      data: area,
    };
  }

  async updateArea(id: string, updateAreaDto: UpdateAreaDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID khu vực không hợp lệ');
    }

    const existingArea = await this.areaModel.findById(id);
    if (!existingArea) {
      throw new NotFoundException('Khu vực không tồn tại');
    }

    // Kiểm tra tên area đã tồn tại chưa (nếu có thay đổi)
    if (updateAreaDto.name && updateAreaDto.name !== existingArea.name) {
      const duplicateName = await this.areaModel.findOne({
        name: updateAreaDto.name,
        _id: { $ne: id },
      });

      if (duplicateName) {
        throw new ConflictException('Tên khu vực đã tồn tại');
      }
    }

    // Kiểm tra campus có tồn tại không (nếu có thay đổi)
    if (updateAreaDto.campus) {
      const campus = await this.campusModel.findById(updateAreaDto.campus);
      if (!campus) {
        throw new NotFoundException('Campus không tồn tại');
      }
    }

    // Chuẩn bị data update
    const updateData: Record<string, any> = { ...updateAreaDto };
    if (updateAreaDto.campus) {
      updateData.campus = new Types.ObjectId(updateAreaDto.campus);
    }

    const updatedArea = await this.areaModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('campus', 'name address');

    return {
      message: 'Cập nhật khu vực thành công',
      data: updatedArea,
    };
  }

  async removeArea(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID khu vực không hợp lệ');
    }

    const area = await this.areaModel.findById(id);
    if (!area) {
      throw new NotFoundException('Khu vực không tồn tại');
    }

    await this.areaModel.findByIdAndDelete(id);

    return {
      message: 'Xóa khu vực thành công',
    };
  }

  // ==================== BUILDING METHODS ====================

  async createBuilding(createBuildingDto: CreateBuildingDto) {
    // Kiểm tra tên building đã tồn tại chưa
    const existingBuilding = await this.buildingModel.findOne({
      name: createBuildingDto.name,
    });

    if (existingBuilding) {
      throw new ConflictException('Tên tòa nhà đã tồn tại');
    }

    // Kiểm tra campus có tồn tại không
    const campus = await this.campusModel.findById(createBuildingDto.campus);
    if (!campus) {
      throw new NotFoundException('Campus không tồn tại');
    }

    const newBuilding = new this.buildingModel({
      ...createBuildingDto,
      campus: new Types.ObjectId(createBuildingDto.campus),
    });

    const savedBuilding = await newBuilding.save();
    await savedBuilding.populate('campus', 'name address');

    return {
      message: 'Tạo tòa nhà thành công',
      data: savedBuilding,
    };
  }

  async findAllBuildings(queryDto: QueryBuildingDto): Promise<{
    message: string;
    data: {
      buildings: any[];
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
      campus,
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
      filter.$or = [{ name: { $regex: search, $options: 'i' } }];
    }

    if (status) {
      filter.status = status;
    }

    if (campus) {
      filter.campus = new Types.ObjectId(campus);
    }

    // Xây dựng sort
    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Thực hiện query
    const [buildings, total] = await Promise.all([
      this.buildingModel
        .find(filter)
        .populate('campus', 'name address')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.buildingModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return {
      message: 'Lấy danh sách tòa nhà thành công',
      data: {
        buildings,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    };
  }

  async findOneBuilding(id: string): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID tòa nhà không hợp lệ');
    }

    const building = await this.buildingModel
      .findById(id)
      .populate('campus', 'name address phone email')
      .lean();

    if (!building) {
      throw new NotFoundException('Tòa nhà không tồn tại');
    }

    return {
      message: 'Lấy thông tin tòa nhà thành công',
      data: building,
    };
  }

  async updateBuilding(id: string, updateBuildingDto: UpdateBuildingDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID tòa nhà không hợp lệ');
    }

    const existingBuilding = await this.buildingModel.findById(id);
    if (!existingBuilding) {
      throw new NotFoundException('Tòa nhà không tồn tại');
    }

    // Kiểm tra tên building đã tồn tại chưa (nếu có thay đổi)
    if (
      updateBuildingDto.name &&
      updateBuildingDto.name !== existingBuilding.name
    ) {
      const duplicateName = await this.buildingModel.findOne({
        name: updateBuildingDto.name,
        _id: { $ne: id },
      });

      if (duplicateName) {
        throw new ConflictException('Tên tòa nhà đã tồn tại');
      }
    }

    // Kiểm tra campus có tồn tại không (nếu có thay đổi)
    if (updateBuildingDto.campus) {
      const campus = await this.campusModel.findById(updateBuildingDto.campus);
      if (!campus) {
        throw new NotFoundException('Campus không tồn tại');
      }
    }

    // Chuẩn bị data update
    const updateData: Record<string, any> = { ...updateBuildingDto };
    if (updateBuildingDto.campus) {
      updateData.campus = new Types.ObjectId(updateBuildingDto.campus);
    }

    const updatedBuilding = await this.buildingModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('campus', 'name address');

    return {
      message: 'Cập nhật tòa nhà thành công',
      data: updatedBuilding,
    };
  }

  async removeBuilding(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID tòa nhà không hợp lệ');
    }

    const building = await this.buildingModel.findById(id);
    if (!building) {
      throw new NotFoundException('Tòa nhà không tồn tại');
    }

    // Kiểm tra có zone nào thuộc building này không
    const zonesCount = await this.zoneModel.countDocuments({ building: id });
    if (zonesCount > 0) {
      throw new ConflictException(
        `Không thể xóa tòa nhà vì còn ${zonesCount} khu vực đang sử dụng`,
      );
    }

    await this.buildingModel.findByIdAndDelete(id);

    return {
      message: 'Xóa tòa nhà thành công',
    };
  }

  // ==================== ZONE METHODS ====================

  async createZone(createZoneDto: CreateZoneDto) {
    // Kiểm tra tên zone đã tồn tại chưa
    const existingZone = await this.zoneModel.findOne({
      name: createZoneDto.name,
    });

    if (existingZone) {
      throw new ConflictException('Tên khu vực đã tồn tại');
    }

    // Kiểm tra building có tồn tại không
    const building = await this.buildingModel.findById(createZoneDto.building);
    if (!building) {
      throw new NotFoundException('Tòa nhà không tồn tại');
    }

    // Kiểm tra floorLocation không vượt quá số tầng của building
    if (createZoneDto.floorLocation > building.floor) {
      throw new BadRequestException(
        `Vị trí tầng không được vượt quá số tầng của tòa nhà (${building.floor} tầng)`,
      );
    }

    const newZone = new this.zoneModel({
      ...createZoneDto,
      building: new Types.ObjectId(createZoneDto.building),
    });

    const savedZone = await newZone.save();
    await savedZone.populate({
      path: 'building',
      select: 'name floor',
      populate: {
        path: 'campus',
        select: 'name address',
      },
    });

    return {
      message: 'Tạo khu vực thành công',
      data: savedZone,
    };
  }

  async findAllZones(queryDto: QueryZoneDto): Promise<{
    message: string;
    data: {
      zones: any[];
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
      zoneType,
      building,
      campus,
      floorLocation,
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
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (zoneType) {
      filter.zoneType = zoneType;
    }

    if (building) {
      filter.building = new Types.ObjectId(building);
    }

    if (campus) {
      // Tìm zones thông qua building
      const buildings = await this.buildingModel.find({
        campus: new Types.ObjectId(campus),
      });
      const buildingIds = buildings.map((b) => b._id);
      filter.building = { $in: buildingIds };
    }

    if (floorLocation !== undefined) {
      filter.floorLocation = floorLocation;
    }

    // Xây dựng sort
    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Thực hiện query
    const [zones, total] = await Promise.all([
      this.zoneModel
        .find(filter)
        .populate({
          path: 'building',
          select: 'name floor',
          populate: {
            path: 'campus',
            select: 'name address',
          },
        })
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.zoneModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return {
      message: 'Lấy danh sách khu vực thành công',
      data: {
        zones,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    };
  }

  async findOneZone(id: string): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID khu vực không hợp lệ');
    }

    const zone = await this.zoneModel
      .findById(id)
      .populate({
        path: 'building',
        select: 'name floor',
        populate: {
          path: 'campus',
          select: 'name address phone email',
        },
      })
      .lean();

    if (!zone) {
      throw new NotFoundException('Khu vực không tồn tại');
    }

    return {
      message: 'Lấy thông tin khu vực thành công',
      data: zone,
    };
  }

  async updateZone(id: string, updateZoneDto: UpdateZoneDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID khu vực không hợp lệ');
    }

    const existingZone = await this.zoneModel.findById(id);
    if (!existingZone) {
      throw new NotFoundException('Khu vực không tồn tại');
    }

    // Kiểm tra tên zone đã tồn tại chưa (nếu có thay đổi)
    if (updateZoneDto.name && updateZoneDto.name !== existingZone.name) {
      const duplicateName = await this.zoneModel.findOne({
        name: updateZoneDto.name,
        _id: { $ne: id },
      });

      if (duplicateName) {
        throw new ConflictException('Tên khu vực đã tồn tại');
      }
    }

    // Kiểm tra building có tồn tại không (nếu có thay đổi)
    let buildingToCheck = null;
    if (updateZoneDto.building) {
      buildingToCheck = await this.buildingModel.findById(
        updateZoneDto.building,
      );
      if (!buildingToCheck) {
        throw new NotFoundException('Tòa nhà không tồn tại');
      }
    } else {
      // Nếu không thay đổi building, lấy building hiện tại
      buildingToCheck = await this.buildingModel.findById(
        existingZone.building,
      );
    }

    // Kiểm tra floorLocation không vượt quá số tầng của building
    if (updateZoneDto.floorLocation && buildingToCheck) {
      const buildingData = buildingToCheck as any;
      if (updateZoneDto.floorLocation > buildingData.floor) {
        throw new BadRequestException(
          `Vị trí tầng không được vượt quá số tầng của tòa nhà (${buildingData.floor} tầng)`,
        );
      }
    }

    // Chuẩn bị data update
    const updateData: Record<string, any> = { ...updateZoneDto };
    if (updateZoneDto.building) {
      updateData.building = new Types.ObjectId(updateZoneDto.building);
    }

    const updatedZone = await this.zoneModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate({
        path: 'building',
        select: 'name floor',
        populate: {
          path: 'campus',
          select: 'name address',
        },
      });

    return {
      message: 'Cập nhật khu vực thành công',
      data: updatedZone,
    };
  }

  async removeZone(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID khu vực không hợp lệ');
    }

    const zone = await this.zoneModel.findById(id);
    if (!zone) {
      throw new NotFoundException('Khu vực không tồn tại');
    }

    await this.zoneModel.findByIdAndDelete(id);

    return {
      message: 'Xóa khu vực thành công',
    };
  }
}
