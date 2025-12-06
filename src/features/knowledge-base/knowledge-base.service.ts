import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  KnowledgeBase,
  type KnowledgeBaseDocument,
} from './schema/knowledge-base.schema';
import {
  CreateKnowledgeDto,
  UpdateKnowledgeDto,
  QueryKnowledgeDto,
} from './dto';
import { SyncService } from '../ai/services/sync.service';
import mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    @InjectModel(KnowledgeBase.name)
    private knowledgeModel: Model<KnowledgeBaseDocument>,
    @Inject(forwardRef(() => SyncService))
    private syncService?: SyncService,
  ) {}

  // Create knowledge
  async create(createDto: CreateKnowledgeDto) {
    const newKnowledge = new this.knowledgeModel(createDto);
    const saved = await newKnowledge.save();

    // Auto-sync to Qdrant
    if (this.syncService) {
      this.syncService.onKnowledgeCreated(saved).catch((error) => {
        this.logger.warn(
          `Failed to sync knowledge ${saved._id}: ${error.message}`,
        );
      });
    }

    return {
      message: 'Tạo kiến thức thành công',
      data: saved,
    };
  }

  // Find all with filters
  async findAll(queryDto: QueryKnowledgeDto) {
    const {
      search,
      type,
      category,
      isActive,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    if (type) {
      filter.type = type;
    }

    if (category) {
      filter.category = category;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.knowledgeModel.find(filter).sort(sort).skip(skip).limit(limitNum),
      this.knowledgeModel.countDocuments(filter),
    ]);

    return {
      message: 'Lấy danh sách kiến thức thành công',
      data: items,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum,
      },
    };
  }

  // Find one by ID
  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const knowledge = await this.knowledgeModel.findById(id);

    if (!knowledge) {
      throw new NotFoundException('Kiến thức không tồn tại');
    }

    return {
      message: 'Lấy thông tin kiến thức thành công',
      data: knowledge,
    };
  }

  // Update
  async update(id: string, updateDto: UpdateKnowledgeDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const existing = await this.knowledgeModel.findById(id);
    if (!existing) {
      throw new NotFoundException('Kiến thức không tồn tại');
    }

    const updated = await this.knowledgeModel.findByIdAndUpdate(id, updateDto, {
      new: true,
    });

    // Auto-update Qdrant
    if (this.syncService && updated) {
      this.syncService.onKnowledgeUpdated(updated).catch((error) => {
        this.logger.warn(`Failed to update index: ${error.message}`);
      });
    }

    return {
      message: 'Cập nhật kiến thức thành công',
      data: updated,
    };
  }

  // Delete
  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const knowledge = await this.knowledgeModel.findById(id);
    if (!knowledge) {
      throw new NotFoundException('Kiến thức không tồn tại');
    }

    await this.knowledgeModel.findByIdAndDelete(id);

    // Auto-delete from Qdrant
    if (this.syncService) {
      this.syncService.onKnowledgeDeleted(id).catch((error) => {
        this.logger.warn(`Failed to delete from index: ${error.message}`);
      });
    }

    return {
      message: 'Xóa kiến thức thành công',
    };
  }

  // Bulk create (for initial data import)
  async bulkCreate(items: CreateKnowledgeDto[]) {
    const created = await this.knowledgeModel.insertMany(items);

    // Queue for indexing
    if (this.syncService) {
      for (const item of created) {
        this.syncService.onKnowledgeCreated(item).catch((error) => {
          this.logger.warn(`Failed to sync ${item._id}: ${error.message}`);
        });
      }
    }

    return {
      message: `Tạo thành công ${created.length} kiến thức`,
      data: { count: created.length, items: created },
    };
  }

  // Import from file (JSON, PDF, Word)
  async importFromFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File không được để trống');
    }

    const fileName = file.originalname.toLowerCase();

    // JSON file - structured data
    if (fileName.endsWith('.json')) {
      return this.importFromJSON(file);
    }

    // PDF file - extract text and create single knowledge
    if (fileName.endsWith('.pdf')) {
      return this.importFromPDF(file);
    }

    // Word file - extract text and create single knowledge
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      return this.importFromWord(file);
    }

    throw new BadRequestException(
      'Chỉ chấp nhận file .json, .pdf, .docx, .doc',
    );
  }

  // Import from JSON
  private async importFromJSON(file: Express.Multer.File) {
    try {
      const fileContent = file.buffer.toString('utf-8');
      const items = JSON.parse(fileContent);

      if (!Array.isArray(items)) {
        throw new BadRequestException(
          'File JSON phải chứa mảng các knowledge items',
        );
      }

      return this.bulkCreate(items);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestException('File JSON không hợp lệ');
      }
      throw error;
    }
  }

  // Import from PDF
  private async importFromPDF(file: Express.Multer.File) {
    try {
      const pdfData: any = await pdfParse(file.buffer);
      const content = (pdfData.text as string).trim();

      if (!content || content.length < 20) {
        throw new BadRequestException(
          'File PDF không chứa đủ nội dung (tối thiểu 20 ký tự)',
        );
      }

      // Extract title from filename or first line
      const title =
        file.originalname.replace('.pdf', '') ||
        content.split('\n')[0].substring(0, 100);

      const knowledge = await this.create({
        title,
        content,
        type: 'GENERAL' as any,
        category: 'document',
        tags: ['pdf', 'imported'],
        metadata: {
          originalFileName: file.originalname,
          fileSize: file.size,
          pageCount: (pdfData as any).numpages,
          importedAt: new Date(),
        },
      });

      return {
        message: 'Import PDF thành công',
        data: knowledge.data,
      };
    } catch (error: any) {
      this.logger.error(`Error importing PDF: ${error.message}`);
      throw new BadRequestException(`Không thể đọc file PDF: ${error.message}`);
    }
  }

  // Import from Word
  private async importFromWord(file: Express.Multer.File) {
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      const content = result.value.trim();

      if (!content || content.length < 20) {
        throw new BadRequestException(
          'File Word không chứa đủ nội dung (tối thiểu 20 ký tự)',
        );
      }

      // Extract title from filename or first line
      const title =
        file.originalname.replace(/\.(docx?|doc)$/i, '') ||
        content.split('\n')[0].substring(0, 100);

      const knowledge = await this.create({
        title,
        content,
        type: 'GENERAL' as any,
        category: 'document',
        tags: ['word', 'imported'],
        metadata: {
          originalFileName: file.originalname,
          fileSize: file.size,
          importedAt: new Date(),
        },
      });

      return {
        message: 'Import Word thành công',
        data: knowledge.data,
      };
    } catch (error: any) {
      this.logger.error(`Error importing Word: ${error.message}`);
      throw new BadRequestException(
        `Không thể đọc file Word: ${error.message}`,
      );
    }
  }
}
