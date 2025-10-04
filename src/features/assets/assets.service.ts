import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AssetCategory,
  type AssetCategoryDocument,
} from './schema/asset_category.schema';
import { AssetType, type AssetTypeDocument } from './schema/asset_type.schema';
import { Asset, type AssetDocument } from './schema/asset.schema';
import { CreateAssetCategoryDto } from './dto/asset-category/create-asset-category.dto';
import { QueryAssetCategoryDto } from './dto/asset-category/query-asset-category.dto';
import { UpdateAssetCategoryDto } from './dto/asset-category/update-asset-category.dto';
import { CreateAssetTypeDto } from './dto/asset-type/create-asset-type.dto';
import { QueryAssetTypeDto } from './dto/asset-type/query-asset-type.dto';
import { UpdateAssetTypeDto } from './dto/asset-type/update-asset-type.dto';
import { CreateAssetDto } from './dto/asset/create-asset.dto';
import { QueryAssetDto } from './dto/asset/query-asset.dto';
import { UpdateAssetDto } from './dto/asset/update-asset.dto';

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel(AssetCategory.name)
    private readonly assetCategoryModel: Model<AssetCategoryDocument>,
    @InjectModel(AssetType.name)
    private readonly assetTypeModel: Model<AssetTypeDocument>,
    @InjectModel(Asset.name)
    private readonly assetModel: Model<AssetDocument>,
  ) {}

  // ========== CATEGORY ==========
  async createCategory(dto: CreateAssetCategoryDto): Promise<{
    message: string;
    data: any;
  }> {
    const dup = await this.assetCategoryModel.findOne({ name: dto.name });
    if (dup) throw new ConflictException('Tên loại tài sản đã tồn tại');
    const created = await this.assetCategoryModel.create(dto);
    return { message: 'Tạo loại tài sản thành công', data: created };
  }

  async findAllCategories(query: QueryAssetCategoryDto): Promise<{
    message: string;
    categories: any[];
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
    } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const filter: Record<string, any> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) filter.status = status;
    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    const [categories, total] = await Promise.all([
      this.assetCategoryModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.assetCategoryModel.countDocuments(filter),
    ]);
    return {
      message: 'Lấy danh sách loại tài sản thành công',
      categories,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum,
      },
    };
  }

  async findOneCategory(id: string): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('ID không hợp lệ');
    const item = await this.assetCategoryModel.findById(id).lean();
    if (!item) throw new NotFoundException('Loại tài sản không tồn tại');
    return { message: 'Lấy loại tài sản thành công', data: item };
  }

  async updateCategory(
    id: string,
    dto: UpdateAssetCategoryDto,
  ): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('ID không hợp lệ');
    if (dto.name) {
      const dup = await this.assetCategoryModel.findOne({
        name: dto.name,
        _id: { $ne: id },
      });
      if (dup) throw new ConflictException('Tên loại tài sản đã tồn tại');
    }
    const updated = await this.assetCategoryModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!updated) throw new NotFoundException('Loại tài sản không tồn tại');
    return { message: 'Cập nhật loại tài sản thành công', data: updated };
  }

  async removeCategory(id: string): Promise<{
    message: string;
  }> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('ID không hợp lệ');
    // ensure no type uses it
    const inUse = await this.assetTypeModel.countDocuments({
      assetCategory: id,
    });
    if (inUse > 0)
      throw new ConflictException('Không thể xóa: còn AssetType đang sử dụng');
    await this.assetCategoryModel.findByIdAndDelete(id);
    return { message: 'Xóa loại tài sản thành công' };
  }

  // ========== TYPE ==========
  async createType(dto: CreateAssetTypeDto): Promise<{
    message: string;
    data: any;
  }> {
    const dup = await this.assetTypeModel.findOne({ name: dto.name });
    if (dup) throw new ConflictException('Tên AssetType đã tồn tại');
    const cat = await this.assetCategoryModel.findById(dto.assetCategory);
    if (!cat) throw new NotFoundException('AssetCategory không tồn tại');
    const created = await this.assetTypeModel.create({
      ...dto,
      assetCategory: new Types.ObjectId(dto.assetCategory),
    });
    return { message: 'Tạo AssetType thành công', data: created };
  }

  async findAllTypes(query: QueryAssetTypeDto): Promise<{
    message: string;
    types: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  }> {
    const {
      search,
      assetCategory,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const filter: Record<string, any> = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (assetCategory) filter.assetCategory = new Types.ObjectId(assetCategory);
    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    const [types, total] = await Promise.all([
      this.assetTypeModel
        .find(filter)
        .populate('assetCategory', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.assetTypeModel.countDocuments(filter),
    ]);
    return {
      message: 'Lấy danh sách AssetType thành công',
      types,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum,
      },
    };
  }

  async findOneType(id: string): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('ID không hợp lệ');
    const item = await this.assetTypeModel
      .findById(id)
      .populate('assetCategory', 'name')
      .lean();
    if (!item) throw new NotFoundException('AssetType không tồn tại');
    return { message: 'Lấy AssetType thành công', data: item };
  }

  async updateType(
    id: string,
    dto: UpdateAssetTypeDto,
  ): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('ID không hợp lệ');
    if (dto.name) {
      const dup = await this.assetTypeModel.findOne({
        name: dto.name,
        _id: { $ne: id },
      });
      if (dup) throw new ConflictException('Tên AssetType đã tồn tại');
    }
    if (dto.assetCategory) {
      const cat = await this.assetCategoryModel.findById(dto.assetCategory);
      if (!cat) throw new NotFoundException('AssetCategory không tồn tại');
    }
    const updateData: Record<string, any> = { ...dto };
    if (dto.assetCategory)
      updateData.assetCategory = new Types.ObjectId(dto.assetCategory);
    const updated = await this.assetTypeModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true },
    );
    if (!updated) throw new NotFoundException('AssetType không tồn tại');
    return { message: 'Cập nhật AssetType thành công', data: updated };
  }

  async removeType(id: string): Promise<{
    message: string;
  }> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('ID không hợp lệ');
    const inUse = await this.assetModel.countDocuments({ assetType: id });
    if (inUse > 0)
      throw new ConflictException('Không thể xóa: còn Asset đang sử dụng');
    await this.assetTypeModel.findByIdAndDelete(id);
    return { message: 'Xóa AssetType thành công' };
  }

  // ========== ASSET ==========
  async createAsset(dto: CreateAssetDto): Promise<{
    message: string;
    data: any;
  }> {
    const dup = await this.assetModel.findOne({
      code: dto.code,
    });
    if (dup) throw new ConflictException('Mã tài sản đã tồn tại');
    const assetType = await this.assetTypeModel.findById(dto.assetType);
    if (!assetType) throw new NotFoundException('AssetType không tồn tại');
    const assetCategory = await this.assetCategoryModel.findById(
      dto.assetCategory,
    );
    if (!assetCategory)
      throw new NotFoundException('AssetCategory không tồn tại');

    // Kiểm tra ít nhất một trong hai (zone hoặc area) phải có giá trị
    if (!dto.zone && !dto.area) {
      throw new BadRequestException(
        'Zone hoặc Area phải có ít nhất một giá trị',
      );
    }

    // Tách các thuộc tính động (properties) ra khỏi các trường cơ bản
    const basicFields = [
      'name',
      'code',
      'status',
      'description',
      'serialNumber',
      'brand',
      'assetType',
      'assetCategory',
      'image',
      'warrantyEndDate',
      'lastMaintenanceDate',
      'zone',
      'area',
      'properties', // Thêm properties vào basicFields để xử lý riêng
    ];

    const properties: Record<string, any> = {};
    const createData: Record<string, any> = {
      assetType: new Types.ObjectId(dto.assetType),
      assetCategory: new Types.ObjectId(dto.assetCategory),
    };

    // Xử lý trường properties nếu có
    if (dto.properties && typeof dto.properties === 'object') {
      Object.assign(properties, dto.properties);
    }

    // Xử lý các trường cơ bản (trừ properties)
    for (const field of basicFields) {
      if (field !== 'properties' && dto[field] !== undefined) {
        createData[field] = dto[field];
      }
    }

    // Xử lý các thuộc tính động (không phải trường cơ bản và không phải properties)
    for (const [key, value] of Object.entries(dto)) {
      if (!basicFields.includes(key) && value !== undefined) {
        properties[key] = value;
      }
    }

    // Thêm properties nếu có
    if (Object.keys(properties).length > 0) {
      createData.properties = properties;
    }

    if (dto.zone) {
      createData.zone = new Types.ObjectId(dto.zone);
    }
    if (dto.area) {
      createData.area = new Types.ObjectId(dto.area);
    }
    const created = await this.assetModel.create(createData);
    const populatePaths = [
      { path: 'assetType', select: 'name' },
      { path: 'assetCategory', select: 'name' },
    ];

    if (dto.zone) {
      populatePaths.push({ path: 'zone', select: 'name floorLocation' });
    }
    if (dto.area) {
      populatePaths.push({ path: 'area', select: 'name zoneType' });
    }

    await created.populate(populatePaths);
    return { message: 'Tạo tài sản thành công', data: created };
  }

  async findAllAssets(query: QueryAssetDto): Promise<{
    message: string;
    assets: any[];
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
      assetType,
      assetCategory,
      zone,
      area,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const filter: Record<string, any> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) filter.status = status;
    if (assetType) filter.assetType = new Types.ObjectId(assetType);
    if (assetCategory) filter.assetCategory = new Types.ObjectId(assetCategory);
    if (zone) filter.zone = new Types.ObjectId(zone);
    if (area) filter.area = new Types.ObjectId(area);
    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    const [assets, total] = await Promise.all([
      this.assetModel
        .find(filter)
        .populate('assetType', 'name')
        .populate('assetCategory', 'name')
        .populate('zone', 'name floorLocation')
        .populate('area', 'name zoneType')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.assetModel.countDocuments(filter),
    ]);
    return {
      message: 'Lấy danh sách tài sản thành công',
      assets,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum,
      },
    };
  }

  async findOneAsset(id: string): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('ID không hợp lệ');
    const item = await this.assetModel
      .findById(id)
      .populate('assetType', 'name')
      .populate('assetCategory', 'name')
      .populate('zone', 'name floorLocation')
      .populate('area', 'name zoneType');
    if (!item) throw new NotFoundException('Tài sản không tồn tại');
    return { message: 'Lấy tài sản thành công', data: item };
  }

  async updateAsset(
    id: string,
    dto: UpdateAssetDto,
  ): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('ID không hợp lệ');
    if (dto.code) {
      const dup = await this.assetModel.findOne({
        _id: { $ne: id },
        code: dto.code,
      });
      if (dup) throw new ConflictException('Mã tài sản đã tồn tại');
    }
    // Tách các thuộc tính động (properties) ra khỏi các trường cơ bản
    const basicFields = [
      'name',
      'code',
      'status',
      'description',
      'serialNumber',
      'brand',
      'assetType',
      'assetCategory',
      'image',
      'warrantyEndDate',
      'lastMaintenanceDate',
      'zone',
      'area',
      'properties', // Thêm properties vào basicFields để xử lý riêng
    ];

    const properties: Record<string, any> = {};
    const updateData: Record<string, any> = {};

    // Xử lý trường properties nếu có
    if (dto.properties && typeof dto.properties === 'object') {
      Object.assign(properties, dto.properties);
    }

    // Xử lý các trường cơ bản (trừ properties)
    for (const field of basicFields) {
      if (field !== 'properties' && dto[field] !== undefined) {
        updateData[field] = dto[field];
      }
    }

    // Xử lý các thuộc tính động (không phải trường cơ bản và không phải properties)
    for (const [key, value] of Object.entries(dto)) {
      if (!basicFields.includes(key) && value !== undefined) {
        properties[key] = value;
      }
    }

    // Thêm properties nếu có
    if (Object.keys(properties).length > 0) {
      updateData.properties = properties;
    }

    if (dto.assetType) updateData.assetType = new Types.ObjectId(dto.assetType);
    if (dto.assetCategory)
      updateData.assetCategory = new Types.ObjectId(dto.assetCategory);
    if (dto.zone) updateData.zone = new Types.ObjectId(dto.zone);
    if (dto.area) updateData.area = new Types.ObjectId(dto.area);
    const updated = await this.assetModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('assetType', 'name')
      .populate('assetCategory', 'name')
      .populate('zone', 'name floorLocation')
      .populate('area', 'name zoneType');
    if (!updated) throw new NotFoundException('Tài sản không tồn tại');
    return { message: 'Cập nhật tài sản thành công', data: updated };
  }

  async removeAsset(id: string): Promise<{
    message: string;
  }> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('ID không hợp lệ');
    await this.assetModel.findByIdAndDelete(id);
    return { message: 'Xóa tài sản thành công' };
  }
}
