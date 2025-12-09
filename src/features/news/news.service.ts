import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { News } from './schema/news.schema';
import { NewsCategory } from './schema/newsCategory.schema';
import { Model, Types } from 'mongoose';
import {
  CreateNewsDto,
  UpdateNewsDto,
  QueryNewsDto,
  CreateNewsCategoryDto,
  UpdateNewsCategoryDto,
  QueryNewsCategoryDto,
} from './dto';
import { UploadService } from '../../shared/upload/upload.service';

@Injectable()
export class NewsService {
  constructor(
    @InjectModel(News.name) private newsModel: Model<News>,
    @InjectModel(NewsCategory.name)
    private newsCategoryModel: Model<NewsCategory>,
    private readonly uploadService: UploadService,
  ) {}

  async create(
    createNewsDto: CreateNewsDto,
    thumbnailFile?: Express.Multer.File,
  ) {
    // Xử lý upload thumbnail nếu có file
    if (thumbnailFile) {
      const thumbnailUrl = await this.uploadService.uploadFile(thumbnailFile);
      createNewsDto.thumbnail = thumbnailUrl;
    }

    // Validate: Phải có thumbnail (từ file upload hoặc URL)
    if (!createNewsDto.thumbnail) {
      throw new BadRequestException(
        'Vui lòng upload ảnh thumbnail hoặc cung cấp URL ảnh thumbnail',
      );
    }

    // Kiểm tra slug đã tồn tại chưa (chỉ để đề phòng)
    const existingSlug = await this.newsModel.findOne({
      slug: createNewsDto.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    });

    if (existingSlug) {
      throw new ConflictException('Tiêu đề tin tức đã tồn tại (slug trùng)');
    }

    const newNews = new this.newsModel(createNewsDto);
    const savedNews = await newNews.save();

    // Populate category trước khi return
    await savedNews.populate('category', 'name slug description isActive');

    return {
      message: 'Tạo tin tức thành công',
      newNews: savedNews,
    };
  }

  async findAll(queryDto: QueryNewsDto): Promise<{
    message: string;
    news: any[];
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
      author,
      category,
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
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (author) {
      filter.author = author;
    }

    if (category) {
      filter.category = category;
    }

    // Xây dựng sort
    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Thực hiện query với populate category
    const [news, total] = await Promise.all([
      this.newsModel
        .find(filter)
        .populate('category', 'name slug description isActive')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.newsModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return {
      message: 'Lấy danh sách tin tức thành công',
      news,
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
      throw new BadRequestException('ID tin tức không hợp lệ');
    }

    const news = await this.newsModel
      .findById(id)
      .populate('category', 'name slug description isActive')
      .lean();

    if (!news) {
      throw new NotFoundException('Tin tức không tồn tại');
    }

    return {
      message: 'Lấy thông tin tin tức thành công',
      data: news,
    };
  }

  async findBySlug(slug: string): Promise<{
    message: string;
    data: any;
  }> {
    const news = await this.newsModel
      .findOne({ slug })
      .populate('category', 'name slug description isActive')
      .lean();

    if (!news) {
      throw new NotFoundException('Tin tức không tồn tại');
    }

    return {
      message: 'Lấy thông tin tin tức thành công',
      data: news,
    };
  }

  async update(
    id: string,
    updateNewsDto: UpdateNewsDto,
    thumbnailFile?: Express.Multer.File,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID tin tức không hợp lệ');
    }

    const existingNews = await this.newsModel.findById(id);
    if (!existingNews) {
      throw new NotFoundException('Tin tức không tồn tại');
    }

    // Xử lý upload thumbnail nếu có file
    if (thumbnailFile) {
      const thumbnailUrl = await this.uploadService.uploadFile(thumbnailFile);
      updateNewsDto.thumbnail = thumbnailUrl;
    }

    // Convert to plain object for easier access
    const updateData = updateNewsDto as Record<string, any>;

    // Kiểm tra tiêu đề đã tồn tại chưa (nếu có thay đổi)
    if (updateData.title && updateData.title !== existingNews.title) {
      // Slug sẽ được tự động tạo bởi pre-save hook
      // Chỉ cần kiểm tra xem có tin tức nào khác có cùng title không
      const duplicateTitle = await this.newsModel.findOne({
        title: updateData.title,
        _id: { $ne: id },
      });

      if (duplicateTitle) {
        throw new ConflictException('Tiêu đề tin tức đã tồn tại');
      }
    }

    const updatedNews = await this.newsModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    // Populate category trước khi return
    if (updatedNews) {
      await updatedNews.populate('category', 'name slug description isActive');
    }

    return {
      message: 'Cập nhật tin tức thành công',
      data: updatedNews,
    };
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID tin tức không hợp lệ');
    }

    const news = await this.newsModel.findById(id);
    if (!news) {
      throw new NotFoundException('Tin tức không tồn tại');
    }

    await this.newsModel.findByIdAndDelete(id);

    return {
      message: 'Xóa tin tức thành công',
    };
  }

  async getNewsStats() {
    // Tính ngày đầu tiên của tháng hiện tại
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalNews, publishedNews, draftNews, newThisMonth] =
      await Promise.all([
        // Tổng tin tức
        this.newsModel.countDocuments(),
        // Đã xuất bản
        this.newsModel.countDocuments({ status: 'PUBLISHED' }),
        // Bản nháp
        this.newsModel.countDocuments({ status: 'DRAFT' }),
        // Mới được thêm tháng này
        this.newsModel.countDocuments({
          createdAt: { $gte: firstDayOfMonth },
        }),
      ]);

    return {
      message: 'Lấy thống kê tin tức thành công',
      stats: {
        total: totalNews,
        published: publishedNews,
        draft: draftNews,
        newThisMonth: newThisMonth,
      },
    };
  }

  // ========== NEWS CATEGORY METHODS ==========

  async createCategory(
    createNewsCategoryDto: CreateNewsCategoryDto,
    imageFile?: Express.Multer.File,
  ) {
    // Kiểm tra tên danh mục đã tồn tại chưa
    const existingCategory = await this.newsCategoryModel.findOne({
      name: createNewsCategoryDto.name,
    });

    if (existingCategory) {
      throw new ConflictException('Tên danh mục đã tồn tại');
    }

    // Xử lý upload image nếu có file
    if (imageFile) {
      const imageUrl = await this.uploadService.uploadFile(imageFile);
      createNewsCategoryDto.image = imageUrl;
    }

    const newCategory = new this.newsCategoryModel(createNewsCategoryDto);
    const savedCategory = await newCategory.save();

    return {
      message: 'Tạo danh mục tin tức thành công',
      savedCategory: savedCategory,
    };
  }

  async findAllCategories(queryDto: QueryNewsCategoryDto): Promise<{
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
      isActive,
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
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    // Xây dựng sort
    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Thực hiện query
    const [categories, total] = await Promise.all([
      this.newsCategoryModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.newsCategoryModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return {
      message: 'Lấy danh sách danh mục tin tức thành công',
      categories,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
      },
    };
  }

  async findOneCategory(id: string): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID danh mục không hợp lệ');
    }

    const category = await this.newsCategoryModel.findById(id).lean();

    if (!category) {
      throw new NotFoundException('Danh mục không tồn tại');
    }

    return {
      message: 'Lấy thông tin danh mục tin tức thành công',
      data: category,
    };
  }

  async findCategoryBySlug(slug: string): Promise<{
    message: string;
    data: any;
  }> {
    const category = await this.newsCategoryModel.findOne({ slug }).lean();

    if (!category) {
      throw new NotFoundException('Danh mục không tồn tại');
    }

    return {
      message: 'Lấy thông tin danh mục tin tức thành công',
      data: category,
    };
  }

  async updateCategory(
    id: string,
    updateNewsCategoryDto: UpdateNewsCategoryDto,
    imageFile?: Express.Multer.File,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID danh mục không hợp lệ');
    }

    // Xử lý upload image nếu có file
    if (imageFile) {
      const imageUrl = await this.uploadService.uploadFile(imageFile);
      updateNewsCategoryDto.image = imageUrl;
    }

    const existingCategory = await this.newsCategoryModel.findById(id);
    if (!existingCategory) {
      throw new NotFoundException('Danh mục không tồn tại');
    }

    // Convert to plain object for easier access
    const updateData = updateNewsCategoryDto as Record<string, any>;

    // Kiểm tra tên danh mục đã tồn tại chưa (nếu có thay đổi)
    if (updateData.name && updateData.name !== existingCategory.name) {
      const duplicateName = await this.newsCategoryModel.findOne({
        name: updateData.name,
        _id: { $ne: id },
      });

      if (duplicateName) {
        throw new ConflictException('Tên danh mục đã tồn tại');
      }
    }

    const updatedCategory = await this.newsCategoryModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true },
    );

    return {
      message: 'Cập nhật danh mục tin tức thành công',
      data: updatedCategory,
    };
  }

  async removeCategory(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID danh mục không hợp lệ');
    }

    const category = await this.newsCategoryModel.findById(id);
    if (!category) {
      throw new NotFoundException('Danh mục không tồn tại');
    }

    // Kiểm tra xem có tin tức nào đang sử dụng danh mục này không
    // (Nếu có trường category trong News schema thì kiểm tra)
    // const newsUsingCategory = await this.newsModel.countDocuments({ category: id });
    // if (newsUsingCategory > 0) {
    //   throw new ConflictException('Không thể xóa danh mục đang được sử dụng');
    // }

    await this.newsCategoryModel.findByIdAndDelete(id);

    return {
      message: 'Xóa danh mục tin tức thành công',
    };
  }
}
