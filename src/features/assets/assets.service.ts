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
import { UploadService } from '../../shared/upload/upload.service';
import { AssetStatus } from './enum/AssetStatus.enum';

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel(AssetCategory.name)
    private readonly assetCategoryModel: Model<AssetCategoryDocument>,
    @InjectModel(AssetType.name)
    private readonly assetTypeModel: Model<AssetTypeDocument>,
    @InjectModel(Asset.name)
    private readonly assetModel: Model<AssetDocument>,
    private readonly uploadService: UploadService,
  ) {}

  // ========== CATEGORY ==========
  async createCategory(
    dto: CreateAssetCategoryDto,
    files?: Express.Multer.File[],
  ): Promise<{
    message: string;
    data: any;
  }> {
    // Xử lý upload file nếu có
    if (files && files.length > 0) {
      const imageFile = files.find((file) => file.fieldname === 'image');
      if (imageFile) {
        const imageUrl = await this.uploadService.uploadFile(imageFile);
        dto.image = imageUrl;
      }
    }

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
    files?: Express.Multer.File[],
  ): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('ID không hợp lệ');

    // Xử lý upload file nếu có
    if (files && files.length > 0) {
      const imageFile = files.find((file) => file.fieldname === 'image');
      if (imageFile) {
        const imageUrl = await this.uploadService.uploadFile(imageFile);
        dto.image = imageUrl;
      }
    }

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
  async createAsset(
    dto: CreateAssetDto,
    files?: Express.Multer.File[],
  ): Promise<{
    message: string;
    data: any;
  }> {
    // Xử lý upload file nếu có
    if (files && files.length > 0) {
      const imageFile = files.find((file) => file.fieldname === 'image');
      if (imageFile) {
        const imageUrl = await this.uploadService.uploadFile(imageFile);
        dto.image = imageUrl;
      }
    }
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
    const dtoAny = dto as Record<string, any>;
    for (const field of basicFields) {
      if (field !== 'properties' && dtoAny[field] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        createData[field] = dtoAny[field];
      }
    }

    // Xử lý các thuộc tính động (không phải trường cơ bản và không phải properties)
    for (const [key, value] of Object.entries(dtoAny)) {
      if (!basicFields.includes(key) && value !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
    const populatePaths: any[] = [
      { path: 'assetType', select: 'name' },
      { path: 'assetCategory', select: 'name' },
    ];

    if (dto.zone) {
      populatePaths.push({
        path: 'zone',
        select: 'name floorLocation zoneType',
        populate: {
          path: 'building',
          select: 'name floor campus',
          populate: {
            path: 'campus',
            select: 'name',
          },
        },
      });
    }
    if (dto.area) {
      populatePaths.push({
        path: 'area',
        select: 'name zoneType',
        populate: {
          path: 'campus',
          select: 'name',
        },
      });
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
        .populate({
          path: 'zone',
          select: 'name floorLocation zoneType',
          populate: {
            path: 'building',
            select: 'name floor campus',
            populate: {
              path: 'campus',
              select: 'name',
            },
          },
        })
        .populate({
          path: 'area',
          select: 'name zoneType',
          populate: {
            path: 'campus',
            select: 'name',
          },
        })
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
    asset: any;
  }> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('ID không hợp lệ');
    const item = await this.assetModel
      .findById(id)
      .populate('assetType', 'name')
      .populate('assetCategory', 'name')
      .populate({
        path: 'zone',
        select: 'name floorLocation zoneType',
        populate: {
          path: 'building',
          select: 'name floor campus',
          populate: {
            path: 'campus',
            select: 'name',
          },
        },
      })
      .populate({
        path: 'area',
        select: 'name zoneType',
        populate: {
          path: 'campus',
          select: 'name',
        },
      });
    if (!item) throw new NotFoundException('Tài sản không tồn tại');
    return { message: 'Lấy tài sản thành công', asset: item };
  }

  async updateAsset(
    id: string,
    dto: UpdateAssetDto,
    files?: Express.Multer.File[],
  ): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('ID không hợp lệ');

    // Xử lý upload file nếu có
    if (files && files.length > 0) {
      const imageFile = files.find((file) => file.fieldname === 'image');
      if (imageFile) {
        const imageUrl = await this.uploadService.uploadFile(imageFile);
        dto.image = imageUrl;
      }
    }

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
    const dtoAny = dto as Record<string, any>;
    for (const field of basicFields) {
      if (field !== 'properties' && dtoAny[field] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        updateData[field] = dtoAny[field];
      }
    }

    // Xử lý các thuộc tính động (không phải trường cơ bản và không phải properties)
    for (const [key, value] of Object.entries(dtoAny)) {
      if (!basicFields.includes(key) && value !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
      .populate({
        path: 'zone',
        select: 'name floorLocation zoneType',
        populate: {
          path: 'building',
          select: 'name floor campus',
          populate: {
            path: 'campus',
            select: 'name',
          },
        },
      })
      .populate({
        path: 'area',
        select: 'name zoneType',
        populate: {
          path: 'campus',
          select: 'name',
        },
      });
    if (!updated) throw new NotFoundException('Tài sản không tồn tại');
    return { message: 'Cập nhật tài sản thành công', data: updated };
  }

  async removeAsset(id: string): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('ID không hợp lệ');

    const asset = await this.assetModel.findById(id);
    if (!asset) {
      throw new NotFoundException('Tài sản không tồn tại');
    }

    // Check if asset is already disposed
    if (asset.status === AssetStatus.DISPOSED) {
      throw new ConflictException('Tài sản đã được thanh lý');
    }

    // Update status to DISPOSED instead of deleting
    const updatedAsset = await this.assetModel
      .findByIdAndUpdate(id, { status: AssetStatus.DISPOSED }, { new: true })
      .populate('assetType', 'name')
      .populate('assetCategory', 'name')
      .populate({
        path: 'zone',
        select: 'name floorLocation zoneType',
        populate: {
          path: 'building',
          select: 'name floor campus',
          populate: {
            path: 'campus',
            select: 'name',
          },
        },
      })
      .populate({
        path: 'area',
        select: 'name zoneType',
        populate: {
          path: 'campus',
          select: 'name',
        },
      });

    return {
      message: 'Thanh lý tài sản thành công',
      data: updatedAsset,
    };
  }

  async getAssetStatistics(): Promise<{
    message: string;
    data: {
      totalAssets: number;
      assetsByStatus: {
        NEW: number;
        IN_USE: number;
        UNDER_MAINTENANCE: number;
        DAMAGED: number;
        LOST: number;
        DISPOSED: number;
        TRANSFERRED: number;
      };
      assetsByCategory: any[];
      assetsByType: any[];
      assetsByLocation: {
        zones: number;
        areas: number;
      };
      assetsByCampus: any[];
      assetsThisMonth: number;
      assetsLastMonth: number;
      growthRate: number; // Tỷ lệ tăng trưởng so với tháng trước (%)
      warrantyExpiringSoon: number; // assets with warranty ending in next 30 days
      warrantyExpired: number; // assets with expired warranty
      maintenanceOverdue: number; // assets needing maintenance
      averageAssetAge: number; // Tuổi trung bình của tài sản (tính bằng tháng)
    };
  }> {
    // Prepare date ranges
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Execute all queries in parallel for better performance
    const [
      totalAssets,
      assetsByStatus,
      assetsByCategory,
      assetsByType,
      assetsInZones,
      assetsInAreas,
      assetsByCampus,
      assetsThisMonth,
      assetsLastMonth,
      warrantyExpiringSoon,
      warrantyExpired,
      maintenanceOverdue,
      averageAgeResult,
    ] = await Promise.all([
      // Total assets
      this.assetModel.countDocuments(),

      // Statistics by status - optimized to avoid $push
      this.assetModel
        .aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ])
        .allowDiskUse(true),

      // Statistics by category - optimized to count directly instead of $push
      this.assetModel
        .aggregate([
          {
            $lookup: {
              from: 'assetcategories',
              localField: 'assetCategory',
              foreignField: '_id',
              as: 'category',
            },
          },
          {
            $unwind: {
              path: '$category',
              preserveNullAndEmptyArrays: false,
            },
          },
          {
            $group: {
              _id: {
                id: '$category._id',
                name: '$category.name',
              },
              count: { $sum: 1 },
              inUse: {
                $sum: { $cond: [{ $eq: ['$status', 'IN_USE'] }, 1, 0] },
              },
              underMaintenance: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'UNDER_MAINTENANCE'] }, 1, 0],
                },
              },
              damaged: {
                $sum: { $cond: [{ $eq: ['$status', 'DAMAGED'] }, 1, 0] },
              },
            },
          },
          {
            $project: {
              _id: '$_id.id',
              name: '$_id.name',
              count: 1,
              inUse: 1,
              underMaintenance: 1,
              damaged: 1,
            },
          },
          {
            $sort: { count: -1 },
          },
        ])
        .allowDiskUse(true),

      // Statistics by type - optimized to count directly instead of $push
      this.assetModel
        .aggregate([
          {
            $lookup: {
              from: 'assettypes',
              localField: 'assetType',
              foreignField: '_id',
              as: 'type',
            },
          },
          {
            $unwind: {
              path: '$type',
              preserveNullAndEmptyArrays: false,
            },
          },
          {
            $group: {
              _id: {
                id: '$type._id',
                name: '$type.name',
              },
              count: { $sum: 1 },
              inUse: {
                $sum: { $cond: [{ $eq: ['$status', 'IN_USE'] }, 1, 0] },
              },
              underMaintenance: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'UNDER_MAINTENANCE'] }, 1, 0],
                },
              },
            },
          },
          {
            $project: {
              _id: '$_id.id',
              name: '$_id.name',
              count: 1,
              inUse: 1,
              underMaintenance: 1,
            },
          },
          {
            $sort: { count: -1 },
          },
          {
            $limit: 10, // Top 10 asset types
          },
        ])
        .allowDiskUse(true),

      // Assets in zones
      this.assetModel.countDocuments({
        zone: { $exists: true, $ne: null },
      }),

      // Assets in areas
      this.assetModel.countDocuments({
        area: { $exists: true, $ne: null },
      }),

      // Statistics by campus - optimized with separate lookups and direct counting
      this.assetModel
        .aggregate([
          {
            $facet: {
              // Assets with zone
              zoneAssets: [
                {
                  $match: {
                    zone: { $exists: true, $ne: null },
                  },
                },
                {
                  $lookup: {
                    from: 'zones',
                    localField: 'zone',
                    foreignField: '_id',
                    as: 'zoneData',
                  },
                },
                {
                  $unwind: '$zoneData',
                },
                {
                  $lookup: {
                    from: 'buildings',
                    localField: 'zoneData.building',
                    foreignField: '_id',
                    as: 'buildingData',
                  },
                },
                {
                  $unwind: '$buildingData',
                },
                {
                  $lookup: {
                    from: 'campus',
                    localField: 'buildingData.campus',
                    foreignField: '_id',
                    as: 'campusData',
                  },
                },
                {
                  $unwind: '$campusData',
                },
                {
                  $group: {
                    _id: '$campusData.name',
                    count: { $sum: 1 },
                    inUse: {
                      $sum: { $cond: [{ $eq: ['$status', 'IN_USE'] }, 1, 0] },
                    },
                  },
                },
              ],
              // Assets with area
              areaAssets: [
                {
                  $match: {
                    area: { $exists: true, $ne: null },
                  },
                },
                {
                  $lookup: {
                    from: 'areas',
                    localField: 'area',
                    foreignField: '_id',
                    as: 'areaData',
                  },
                },
                {
                  $unwind: '$areaData',
                },
                {
                  $lookup: {
                    from: 'campus',
                    localField: 'areaData.campus',
                    foreignField: '_id',
                    as: 'campusData',
                  },
                },
                {
                  $unwind: '$campusData',
                },
                {
                  $group: {
                    _id: '$campusData.name',
                    count: { $sum: 1 },
                    inUse: {
                      $sum: { $cond: [{ $eq: ['$status', 'IN_USE'] }, 1, 0] },
                    },
                  },
                },
              ],
            },
          },
          {
            $project: {
              allAssets: { $concatArrays: ['$zoneAssets', '$areaAssets'] },
            },
          },
          {
            $unwind: '$allAssets',
          },
          {
            $group: {
              _id: '$allAssets._id',
              count: { $sum: '$allAssets.count' },
              inUse: { $sum: '$allAssets.inUse' },
            },
          },
          {
            $project: {
              name: '$_id',
              count: 1,
              inUse: 1,
            },
          },
          {
            $sort: { count: -1 },
          },
        ])
        .allowDiskUse(true),

      // Assets this month
      this.assetModel.countDocuments({
        createdAt: { $gte: thisMonthStart },
      }),

      // Assets last month
      this.assetModel.countDocuments({
        createdAt: {
          $gte: lastMonthStart,
          $lte: lastMonthEnd,
        },
      }),

      // Warranty expiring soon
      this.assetModel.countDocuments({
        warrantyEndDate: {
          $gte: new Date(),
          $lte: thirtyDaysFromNow,
        },
      }),

      // Warranty expired
      this.assetModel.countDocuments({
        warrantyEndDate: {
          $lt: new Date(),
        },
        status: { $nin: ['DISPOSED', 'LOST'] },
      }),

      // Maintenance overdue
      this.assetModel.countDocuments({
        $or: [
          { lastMaintenanceDate: { $lt: sixMonthsAgo } },
          { lastMaintenanceDate: { $exists: false } },
        ],
        status: { $nin: ['DISPOSED', 'LOST', 'NEW'] },
      }),

      // Average asset age
      this.assetModel
        .aggregate([
          {
            $project: {
              ageInMonths: {
                $divide: [
                  { $subtract: [new Date(), '$createdAt'] },
                  1000 * 60 * 60 * 24 * 30, // Convert milliseconds to months
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              averageAge: { $avg: '$ageInMonths' },
            },
          },
        ])
        .allowDiskUse(true),
    ]);

    // Process status statistics
    const statusStats = {
      NEW: 0,
      IN_USE: 0,
      UNDER_MAINTENANCE: 0,
      DAMAGED: 0,
      LOST: 0,
      DISPOSED: 0,
      TRANSFERRED: 0,
    };

    assetsByStatus.forEach((stat: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (stat._id in statusStats) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        statusStats[stat._id as keyof typeof statusStats] = stat.count;
      }
    });

    // Calculate growth rate
    const growthRate =
      assetsLastMonth > 0
        ? ((assetsThisMonth - assetsLastMonth) / assetsLastMonth) * 100
        : 0;

    // Calculate average asset age
    const averageAssetAge =
      averageAgeResult.length > 0
        ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          Math.round(averageAgeResult[0].averageAge * 10) / 10
        : 0;

    return {
      message: 'Lấy thống kê tài sản thành công',
      data: {
        totalAssets,
        assetsByStatus: statusStats,
        assetsByCategory,
        assetsByType,
        assetsByLocation: {
          zones: assetsInZones,
          areas: assetsInAreas,
        },
        assetsByCampus,
        assetsThisMonth,
        assetsLastMonth,
        growthRate: Math.round(growthRate * 100) / 100,
        warrantyExpiringSoon,
        warrantyExpired,
        maintenanceOverdue,
        averageAssetAge,
      },
    };
  }

  // Thống kê chi tiết theo category
  async getCategoryStatistics(): Promise<{
    message: string;
    data: any[];
  }> {
    const categoryStats = await this.assetModel.aggregate([
      {
        $lookup: {
          from: 'assetcategories',
          localField: 'assetCategory',
          foreignField: '_id',
          as: 'category',
        },
      },
      {
        $unwind: '$category',
      },
      {
        $group: {
          _id: {
            id: '$category._id',
            name: '$category.name',
            image: '$category.image',
          },
          totalAssets: { $sum: 1 },
          statuses: { $push: '$status' },
        },
      },
      {
        $project: {
          _id: '$_id.id',
          name: '$_id.name',
          image: '$_id.image',
          totalAssets: 1,
          new: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'NEW'] },
              },
            },
          },
          inUse: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'IN_USE'] },
              },
            },
          },
          underMaintenance: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'UNDER_MAINTENANCE'] },
              },
            },
          },
          damaged: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'DAMAGED'] },
              },
            },
          },
          lost: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'LOST'] },
              },
            },
          },
          disposed: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'DISPOSED'] },
              },
            },
          },
          transferred: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'TRANSFERRED'] },
              },
            },
          },
        },
      },
      {
        $sort: { totalAssets: -1 },
      },
    ]);

    return {
      message: 'Lấy thống kê theo loại tài sản thành công',
      data: categoryStats,
    };
  }

  // Thống kê chi tiết theo type
  async getTypeStatistics(categoryId?: string): Promise<{
    message: string;
    data: any[];
  }> {
    const matchStage: Record<string, any> = {};
    if (categoryId && Types.ObjectId.isValid(categoryId)) {
      matchStage.assetCategory = new Types.ObjectId(categoryId);
    }

    const pipeline: any[] = [];

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'assettypes',
          localField: 'assetType',
          foreignField: '_id',
          as: 'type',
        },
      },
      {
        $unwind: '$type',
      },
      {
        $lookup: {
          from: 'assetcategories',
          localField: 'assetCategory',
          foreignField: '_id',
          as: 'category',
        },
      },
      {
        $unwind: '$category',
      },
      {
        $group: {
          _id: {
            id: '$type._id',
            name: '$type.name',
            categoryName: '$category.name',
          },
          totalAssets: { $sum: 1 },
          statuses: { $push: '$status' },
        },
      },
      {
        $project: {
          _id: '$_id.id',
          name: '$_id.name',
          categoryName: '$_id.categoryName',
          totalAssets: 1,
          new: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'NEW'] },
              },
            },
          },
          inUse: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'IN_USE'] },
              },
            },
          },
          underMaintenance: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'UNDER_MAINTENANCE'] },
              },
            },
          },
          damaged: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'DAMAGED'] },
              },
            },
          },
          lost: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'LOST'] },
              },
            },
          },
          disposed: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'DISPOSED'] },
              },
            },
          },
          transferred: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'TRANSFERRED'] },
              },
            },
          },
        },
      },
      {
        $sort: { totalAssets: -1 },
      },
    );

    const typeStats = await this.assetModel.aggregate(pipeline);

    return {
      message: 'Lấy thống kê theo kiểu tài sản thành công',
      data: typeStats,
    };
  }

  // Thống kê theo địa điểm (zone/area)
  async getLocationStatistics(): Promise<{
    message: string;
    data: {
      byZones: any[];
      byAreas: any[];
    };
  }> {
    // Thống kê theo zones
    const zoneStats = await this.assetModel.aggregate([
      {
        $match: {
          zone: { $exists: true, $ne: null },
        },
      },
      {
        $lookup: {
          from: 'zones',
          localField: 'zone',
          foreignField: '_id',
          as: 'zoneData',
        },
      },
      {
        $unwind: '$zoneData',
      },
      {
        $lookup: {
          from: 'buildings',
          localField: 'zoneData.building',
          foreignField: '_id',
          as: 'buildingData',
        },
      },
      {
        $unwind: {
          path: '$buildingData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'campus',
          localField: 'buildingData.campus',
          foreignField: '_id',
          as: 'campusData',
        },
      },
      {
        $unwind: {
          path: '$campusData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            zoneId: '$zoneData._id',
            zoneName: '$zoneData.name',
            buildingName: '$buildingData.name',
            campusName: '$campusData.name',
          },
          totalAssets: { $sum: 1 },
          statuses: { $push: '$status' },
        },
      },
      {
        $project: {
          _id: '$_id.zoneId',
          zoneName: '$_id.zoneName',
          buildingName: '$_id.buildingName',
          campusName: '$_id.campusName',
          totalAssets: 1,
          inUse: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'IN_USE'] },
              },
            },
          },
          underMaintenance: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'UNDER_MAINTENANCE'] },
              },
            },
          },
          damaged: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'DAMAGED'] },
              },
            },
          },
        },
      },
      {
        $sort: { totalAssets: -1 },
      },
    ]);

    // Thống kê theo areas
    const areaStats = await this.assetModel.aggregate([
      {
        $match: {
          area: { $exists: true, $ne: null },
        },
      },
      {
        $lookup: {
          from: 'areas',
          localField: 'area',
          foreignField: '_id',
          as: 'areaData',
        },
      },
      {
        $unwind: '$areaData',
      },
      {
        $lookup: {
          from: 'campus',
          localField: 'areaData.campus',
          foreignField: '_id',
          as: 'campusData',
        },
      },
      {
        $unwind: {
          path: '$campusData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            areaId: '$areaData._id',
            areaName: '$areaData.name',
            campusName: '$campusData.name',
          },
          totalAssets: { $sum: 1 },
          statuses: { $push: '$status' },
        },
      },
      {
        $project: {
          _id: '$_id.areaId',
          areaName: '$_id.areaName',
          campusName: '$_id.campusName',
          totalAssets: 1,
          inUse: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'IN_USE'] },
              },
            },
          },
          underMaintenance: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'UNDER_MAINTENANCE'] },
              },
            },
          },
          damaged: {
            $size: {
              $filter: {
                input: '$statuses',
                as: 'status',
                cond: { $eq: ['$$status', 'DAMAGED'] },
              },
            },
          },
        },
      },
      {
        $sort: { totalAssets: -1 },
      },
    ]);

    return {
      message: 'Lấy thống kê theo địa điểm thành công',
      data: {
        byZones: zoneStats,
        byAreas: areaStats,
      },
    };
  }

  // Thống kê bảo trì và bảo hành
  async getMaintenanceWarrantyStatistics(): Promise<{
    message: string;
    data: {
      warrantyExpiring: number; // Số tài sản sắp hết bảo hành (30 ngày)
      warrantyExpired: number; // Số tài sản đã hết bảo hành
      maintenanceOverdue: number; // Số tài sản cần bảo trì (6 tháng)
      recentlyMaintained: number; // Số tài sản được bảo trì gần đây (30 ngày)
      neverMaintained: number; // Số tài sản chưa bao giờ được bảo trì
    };
  }> {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Số tài sản hết hạn bảo hành trong 30 ngày tới
    const warrantyExpiring = await this.assetModel.countDocuments({
      warrantyEndDate: {
        $gte: now,
        $lte: thirtyDaysFromNow,
      },
    });

    // Số tài sản đã hết hạn bảo hành
    const warrantyExpired = await this.assetModel.countDocuments({
      warrantyEndDate: {
        $lt: now,
      },
      status: { $nin: ['DISPOSED', 'LOST'] },
    });

    // Số tài sản cần bảo trì
    const maintenanceOverdue = await this.assetModel.countDocuments({
      lastMaintenanceDate: { $lt: sixMonthsAgo },
      status: { $nin: ['DISPOSED', 'LOST', 'NEW'] },
    });

    // Số tài sản được bảo trì gần đây (30 ngày qua)
    const recentlyMaintained = await this.assetModel.countDocuments({
      lastMaintenanceDate: { $gte: thirtyDaysAgo },
    });

    // Số tài sản chưa bao giờ được bảo trì
    const neverMaintained = await this.assetModel.countDocuments({
      lastMaintenanceDate: { $exists: false },
      status: { $nin: ['DISPOSED', 'LOST', 'NEW'] },
    });

    return {
      message: 'Lấy thống kê bảo trì và bảo hành thành công',
      data: {
        warrantyExpiring,
        warrantyExpired,
        maintenanceOverdue,
        recentlyMaintained,
        neverMaintained,
      },
    };
  }

  async getAssetByZone(zoneId: string): Promise<{
    message: string;
    assets: any[];
  }> {
    if (!Types.ObjectId.isValid(zoneId))
      throw new BadRequestException('ID không hợp lệ');
    const assets = await this.assetModel
      .find({ zone: new Types.ObjectId(zoneId) })
      .populate('assetType', 'name')
      .populate('assetCategory', 'name')
      .lean();
    return { message: 'Lấy tài sản theo khu vực thành công', assets };
  }

  async getAssetByArea(areaId: string): Promise<{
    message: string;
    assets: any[];
  }> {
    if (!Types.ObjectId.isValid(areaId))
      throw new BadRequestException('ID không hợp lệ');
    const assets = await this.assetModel
      .find({ area: new Types.ObjectId(areaId) })
      .populate('assetType', 'name')
      .populate('assetCategory', 'name')
      .lean();
    return { message: 'Lấy tài sản theo khu vực thành công', assets };
  }
}
