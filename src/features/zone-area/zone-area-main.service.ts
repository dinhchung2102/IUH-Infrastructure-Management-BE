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
    areas: any[];
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
      areas,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
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
    buildings: any[];
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
      buildings,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
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

    // Validate: Zone must belong to either building OR area (but not both)
    if (!createZoneDto.building && !createZoneDto.area) {
      throw new BadRequestException(
        'Zone phải thuộc về một tòa nhà hoặc một khu vực ngoài trời',
      );
    }

    if (createZoneDto.building && createZoneDto.area) {
      throw new BadRequestException(
        'Zone không thể thuộc về cả tòa nhà và khu vực ngoài trời. Vui lòng chọn một.',
      );
    }

    const zoneData: any = {
      name: createZoneDto.name,
      description: createZoneDto.description,
      status: createZoneDto.status,
      zoneType: createZoneDto.zoneType,
    };

    // Handle building case
    if (createZoneDto.building) {
      const building = await this.buildingModel.findById(createZoneDto.building);
      if (!building) {
        throw new NotFoundException('Tòa nhà không tồn tại');
      }

      // floorLocation is required for zones in buildings
      if (!createZoneDto.floorLocation) {
        throw new BadRequestException(
          'Vị trí tầng là bắt buộc khi zone thuộc tòa nhà',
        );
      }

      // Kiểm tra floorLocation không vượt quá số tầng của building
      if (createZoneDto.floorLocation > building.floor) {
        throw new BadRequestException(
          `Vị trí tầng không được vượt quá số tầng của tòa nhà (${building.floor} tầng)`,
        );
      }

      zoneData.building = new Types.ObjectId(createZoneDto.building);
      zoneData.floorLocation = createZoneDto.floorLocation;
    }

    // Handle area case
    if (createZoneDto.area) {
      const area = await this.areaModel.findById(createZoneDto.area);
      if (!area) {
        throw new NotFoundException('Khu vực ngoài trời không tồn tại');
      }

      // floorLocation should not be set for zones in areas
      if (createZoneDto.floorLocation) {
        throw new BadRequestException(
          'Zone trong khu vực ngoài trời không thể có vị trí tầng',
        );
      }

      zoneData.area = new Types.ObjectId(createZoneDto.area);
    }

    const newZone = new this.zoneModel(zoneData);
    const savedZone = await newZone.save();

    // Populate based on whether it's a building or area
    if (savedZone.building) {
      await savedZone.populate({
        path: 'building',
        select: 'name floor',
        populate: {
          path: 'campus',
          select: 'name address',
        },
      });
    } else if (savedZone.area) {
      await savedZone.populate({
        path: 'area',
        select: 'name description',
        populate: {
          path: 'campus',
          select: 'name address',
        },
      });
    }

    return {
      message: 'Tạo khu vực thành công',
      data: savedZone,
    };
  }

  async findAllZones(queryDto: QueryZoneDto): Promise<{
    message: string;
    zones: any[];
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
    const andConditions: any[] = [];

    // Search condition
    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      });
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

    if (queryDto.area) {
      filter.area = new Types.ObjectId(queryDto.area);
    }

    if (campus) {
      // Tìm zones thông qua building hoặc area
      const [buildings, areas] = await Promise.all([
        this.buildingModel.find({
          campus: new Types.ObjectId(campus),
        }),
        this.areaModel.find({
          campus: new Types.ObjectId(campus),
        }),
      ]);
      
      const buildingIds = buildings.map((b) => b._id);
      const areaIds = areas.map((a) => a._id);
      
      // Zones can be in buildings OR areas of this campus
      const campusConditions: any[] = [];
      if (buildingIds.length > 0) {
        campusConditions.push({ building: { $in: buildingIds } });
      }
      if (areaIds.length > 0) {
        campusConditions.push({ area: { $in: areaIds } });
      }
      
      if (campusConditions.length > 0) {
        andConditions.push({ $or: campusConditions });
      } else {
        // No buildings or areas in this campus, return empty result
        andConditions.push({ _id: { $in: [] } });
      }
    }

    if (floorLocation !== undefined) {
      filter.floorLocation = floorLocation;
    }

    // Combine all conditions
    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    // Xây dựng sort
    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Thực hiện query
    const [zones, total] = await Promise.all([
      this.zoneModel
        .find(filter)
        .populate([
          {
            path: 'building',
            select: 'name floor',
            populate: {
              path: 'campus',
              select: 'name address',
            },
          },
          {
            path: 'area',
            select: 'name description',
            populate: {
              path: 'campus',
              select: 'name address',
            },
          },
        ])
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.zoneModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return {
      message: 'Lấy danh sách khu vực thành công',
      zones,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
      },
    };
  }

  async findAllZonesByBuildingAndFloor(
    buildingId: string,
    floor: number,
  ): Promise<{
    message: string;
    zones: any[];
  }> {
    if (!Types.ObjectId.isValid(buildingId)) {
      throw new BadRequestException('ID tòa nhà không hợp lệ');
    }

    const zones = await this.zoneModel
      .find({ building: new Types.ObjectId(buildingId), floorLocation: floor })
      .populate([
        {
          path: 'building',
          select: 'name floor',
          populate: {
            path: 'campus',
            select: 'name address',
          },
        },
        {
          path: 'area',
          select: 'name description',
          populate: {
            path: 'campus',
            select: 'name address',
          },
        },
      ])
      .lean();

    return {
      message: 'Lấy danh sách khu vực theo tòa nhà và tầng thành công',
      zones,
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
      .populate([
        {
          path: 'building',
          select: 'name floor',
          populate: {
            path: 'campus',
            select: 'name address phone email',
          },
        },
        {
          path: 'area',
          select: 'name description',
          populate: {
            path: 'campus',
            select: 'name address phone email',
          },
        },
      ])
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

    // Determine final building and area values after update
    const finalBuilding = updateZoneDto.building
      ? updateZoneDto.building
      : existingZone.building?.toString();
    const finalArea = updateZoneDto.area
      ? updateZoneDto.area
      : existingZone.area?.toString();

    // Validate: Zone must belong to either building OR area (but not both)
    if (finalBuilding && finalArea) {
      throw new BadRequestException(
        'Zone không thể thuộc về cả tòa nhà và khu vực ngoài trời. Vui lòng chọn một.',
      );
    }

    if (!finalBuilding && !finalArea) {
      throw new BadRequestException(
        'Zone phải thuộc về một tòa nhà hoặc một khu vực ngoài trời',
      );
    }

    // Prepare update data
    const updateData: Record<string, any> = { ...updateZoneDto };

    // Handle building case
    if (finalBuilding) {
      const building = await this.buildingModel.findById(finalBuilding);
      if (!building) {
        throw new NotFoundException('Tòa nhà không tồn tại');
      }

      // If switching from area to building, floorLocation is required
      const floorLocation =
        updateZoneDto.floorLocation !== undefined
          ? updateZoneDto.floorLocation
          : existingZone.floorLocation;

      if (!floorLocation) {
        throw new BadRequestException(
          'Vị trí tầng là bắt buộc khi zone thuộc tòa nhà',
        );
      }

      // Kiểm tra floorLocation không vượt quá số tầng của building
      if (floorLocation > building.floor) {
        throw new BadRequestException(
          `Vị trí tầng không được vượt quá số tầng của tòa nhà (${building.floor} tầng)`,
        );
      }

      updateData.building = new Types.ObjectId(finalBuilding);
      updateData.floorLocation = floorLocation;
      // Clear area if switching
      if (existingZone.area) {
        updateData.area = null;
      }
    }

    // Handle area case
    if (finalArea) {
      const area = await this.areaModel.findById(finalArea);
      if (!area) {
        throw new NotFoundException('Khu vực ngoài trời không tồn tại');
      }

      // Zone in area cannot have floorLocation
      if (updateZoneDto.floorLocation !== undefined) {
        throw new BadRequestException(
          'Zone trong khu vực ngoài trời không thể có vị trí tầng',
        );
      }

      updateData.area = new Types.ObjectId(finalArea);
      // Clear building and floorLocation if switching
      if (existingZone.building) {
        updateData.building = null;
        updateData.floorLocation = null;
      }
    }

    const updatedZone = await this.zoneModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate([
        {
          path: 'building',
          select: 'name floor',
          populate: {
            path: 'campus',
            select: 'name address',
          },
        },
        {
          path: 'area',
          select: 'name description',
          populate: {
            path: 'campus',
            select: 'name address',
          },
        },
      ]);

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

  async findAllZonesByBuilding(buildingId: string): Promise<{
    message: string;
    zones: any[];
  }> {
    if (!Types.ObjectId.isValid(buildingId)) {
      throw new BadRequestException('ID tòa nhà không hợp lệ');
    }

    // Kiểm tra building có tồn tại không
    const building = await this.buildingModel.findById(buildingId);
    if (!building) {
      throw new NotFoundException('Tòa nhà không tồn tại');
    }

    const zones = await this.zoneModel
      .find({ building: new Types.ObjectId(buildingId) })
      .populate([
        {
          path: 'building',
          select: 'name floor',
          populate: {
            path: 'campus',
            select: 'name address',
          },
        },
        {
          path: 'area',
          select: 'name description',
          populate: {
            path: 'campus',
            select: 'name address',
          },
        },
      ])
      .sort({ floorLocation: 1, name: 1 })
      .lean();

    return {
      message: 'Lấy danh sách khu vực theo tòa nhà thành công',
      zones,
    };
  }

  async findAllZonesByArea(areaId: string): Promise<{
    message: string;
    zones: any[];
  }> {
    if (!Types.ObjectId.isValid(areaId)) {
      throw new BadRequestException('ID khu vực ngoài trời không hợp lệ');
    }

    // Kiểm tra area có tồn tại không
    const area = await this.areaModel.findById(areaId);
    if (!area) {
      throw new NotFoundException('Khu vực ngoài trời không tồn tại');
    }

    const zones = await this.zoneModel
      .find({ area: new Types.ObjectId(areaId) })
      .populate([
        {
          path: 'building',
          select: 'name floor',
          populate: {
            path: 'campus',
            select: 'name address',
          },
        },
        {
          path: 'area',
          select: 'name description',
          populate: {
            path: 'campus',
            select: 'name address',
          },
        },
      ])
      .sort({ name: 1 })
      .lean();

    return {
      message: 'Lấy danh sách khu vực theo khu vực ngoài trời thành công',
      zones,
    };
  }

  async findAllBuildingsByCampus(campusId: string): Promise<{
    message: string;
    buildings: any[];
  }> {
    if (!Types.ObjectId.isValid(campusId)) {
      throw new BadRequestException('ID campus không hợp lệ');
    }

    // Kiểm tra campus có tồn tại không
    const campus = await this.campusModel.findById(campusId);
    if (!campus) {
      throw new NotFoundException('Campus không tồn tại');
    }

    const buildings = await this.buildingModel
      .find({ campus: new Types.ObjectId(campusId) })
      .populate('campus', 'name address')
      .sort({ name: 1 })
      .lean();

    return {
      message: 'Lấy danh sách tòa nhà theo campus thành công',
      buildings,
    };
  }

  async findAllAreasByCampus(campusId: string): Promise<{
    message: string;
    areas: any[];
  }> {
    if (!Types.ObjectId.isValid(campusId)) {
      throw new BadRequestException('ID campus không hợp lệ');
    }

    // Kiểm tra campus có tồn tại không
    const campus = await this.campusModel.findById(campusId);
    if (!campus) {
      throw new NotFoundException('Campus không tồn tại');
    }

    const areas = await this.areaModel
      .find({ campus: new Types.ObjectId(campusId) })
      .populate('campus', 'name address')
      .sort({ name: 1 })
      .lean();

    return {
      message: 'Lấy danh sách khu vực theo campus thành công',
      areas,
    };
  }

  // ==================== STATISTICS METHODS ====================

  async getBuildingStats() {
    // Tính ngày đầu tiên của tháng hiện tại
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalBuildings, activeBuildings, inactiveBuildings, newThisMonth] =
      await Promise.all([
        // Tổng tòa nhà
        this.buildingModel.countDocuments(),
        // Đang hoạt động
        this.buildingModel.countDocuments({ status: 'ACTIVE' }),
        // Ngừng hoạt động
        this.buildingModel.countDocuments({ status: 'INACTIVE' }),
        // Mới được thêm tháng này
        this.buildingModel.countDocuments({
          createdAt: { $gte: firstDayOfMonth },
        }),
      ]);

    return {
      message: 'Lấy thống kê tòa nhà thành công',
      stats: {
        total: totalBuildings,
        active: activeBuildings,
        inactive: inactiveBuildings,
        newThisMonth: newThisMonth,
      },
    };
  }

  async getAreaStats() {
    // Tính ngày đầu tiên của tháng hiện tại
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalAreas, activeAreas, inactiveAreas, newThisMonth] =
      await Promise.all([
        // Tổng khu vực
        this.areaModel.countDocuments(),
        // Đang hoạt động
        this.areaModel.countDocuments({ status: 'ACTIVE' }),
        // Ngừng hoạt động
        this.areaModel.countDocuments({ status: 'INACTIVE' }),
        // Mới được thêm tháng này
        this.areaModel.countDocuments({
          createdAt: { $gte: firstDayOfMonth },
        }),
      ]);

    return {
      message: 'Lấy thống kê khu vực thành công',
      stats: {
        total: totalAreas,
        active: activeAreas,
        inactive: inactiveAreas,
        newThisMonth: newThisMonth,
      },
    };
  }

  async getZoneStats() {
    // Tính ngày đầu tiên của tháng hiện tại
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalZones, activeZones, inactiveZones, newThisMonth] =
      await Promise.all([
        // Tổng zone
        this.zoneModel.countDocuments(),
        // Đang hoạt động
        this.zoneModel.countDocuments({ status: 'ACTIVE' }),
        // Ngừng hoạt động
        this.zoneModel.countDocuments({ status: 'INACTIVE' }),
        // Mới được thêm tháng này
        this.zoneModel.countDocuments({
          createdAt: { $gte: firstDayOfMonth },
        }),
      ]);

    return {
      message: 'Lấy thống kê zone thành công',
      stats: {
        total: totalZones,
        active: activeZones,
        inactive: inactiveZones,
        newThisMonth: newThisMonth,
      },
    };
  }
}
