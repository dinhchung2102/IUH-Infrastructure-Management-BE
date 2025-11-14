# 🤖 PROMPT CHO AGENT IDE - TRIỂN KHAI HỆ THỐNG AI RAG

## 📋 CONTEXT

Tôi có hệ thống quản lý cơ sở vật chất (CSVC) cho trường đại học, sử dụng NestJS + MongoDB. Cần tích hợp AI với:

- **Database**: MongoDB (đã có sẵn)
- **Vector DB**: Qdrant (self-hosted) - cho vector embeddings
- **LLM Provider**: Google Gemini API
- **Queue**: BullMQ + Redis (đã có sẵn Redis trong project)
- **Cache**: Redis (đã có sẵn)

## 🎯 YÊU CẦU CHUNG

Áp dụng best practices:

- TypeScript strict mode
- Dependency Injection pattern
- Error handling đầy đủ
- Config từ environment variables
- Có comment tiếng Việt giải thích logic
- Sử dụng Mongoose cho MongoDB operations

---

## 📦 BƯỚC 1: CÀI ĐẶT DEPENDENCIES

```bash
# Cài đặt các package cần thiết cho AI module
npm install @google/generative-ai @qdrant/js-client-rest bullmq ioredis
npm install --save-dev @types/ioredis

# Nếu chưa có Mongoose
npm install @nestjs/mongoose mongoose
npm install --save-dev @types/mongoose
```

---

## 🏗️ BƯỚC 2: TẠO CẤU TRÚC MODULE

Tạo cấu trúc thư mục sau trong NestJS:

```
src/
├── ai/
│   ├── ai.module.ts
│   ├── controllers/
│   │   ├── chat.controller.ts
│   │   ├── classification.controller.ts
│   │   └── search.controller.ts
│   ├── services/
│   │   ├── gemini.service.ts           # Wrapper cho Gemini API
│   │   ├── qdrant.service.ts           # Vector DB operations
│   │   ├── rag.service.ts              # RAG core logic
│   │   ├── classification.service.ts   # Phân loại sự cố
│   │   ├── indexing.service.ts         # Index documents
│   │   └── sync.service.ts             # Đồng bộ MongoDB ↔ Qdrant
│   ├── queues/
│   │   ├── indexing.processor.ts       # BullMQ worker
│   │   └── indexing.queue.ts
│   ├── schemas/
│   │   ├── ai-metadata.schema.ts       # Schema cho AI metadata
│   │   └── indexed-document.schema.ts  # Schema tracking indexed docs
│   ├── dtos/
│   │   ├── chat.dto.ts
│   │   ├── classify-incident.dto.ts
│   │   └── search.dto.ts
│   └── interfaces/
│       ├── document.interface.ts
│       └── classification.interface.ts
├── incidents/
│   └── schemas/
│       └── incident.schema.ts          # Update schema với AI fields
├── cache/
│   ├── cache.module.ts
│   └── cache.service.ts
└── scripts/
    └── ingest/
        ├── ingest-documents.ts
        └── chunk-utils.ts
```

---

## 🗄️ BƯỚC 3: MONGOOSE SCHEMAS

### **File: `src/incidents/schemas/incident.schema.ts`**

Cập nhật Incident schema với AI-related fields:

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Incident extends Document {
  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  location: string;

  @Prop({
    type: String,
    enum: [
      'DIEN',
      'NUOC',
      'MANG',
      'NOI_THAT',
      'DIEU_HOA',
      'VE_SINH',
      'AN_NINH',
      'KHAC',
    ],
  })
  category: string;

  @Prop({ type: String, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] })
  priority: string;

  @Prop({ type: String })
  vectorId: string; // Link tới Qdrant point ID (thường dùng _id.toString())

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Staff' }] })
  assignedStaff: Types.ObjectId[];

  @Prop({
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    default: 'PENDING',
  })
  status: string;

  @Prop({ type: Object })
  aiMetadata: {
    classificationScore: number;
    suggestedStaffSkills: string[];
    estimatedDuration: number;
    reasoning: string;
    autoClassified: boolean;
    classifiedAt: Date;
  };

  @Prop({ type: [String] })
  images: string[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reportedBy: Types.ObjectId;

  @Prop({ type: Date })
  resolvedAt?: Date;
}

export const IncidentSchema = SchemaFactory.createForClass(Incident);

// Indexes
IncidentSchema.index({ category: 1, status: 1 });
IncidentSchema.index({ priority: -1, createdAt: -1 });
IncidentSchema.index({ vectorId: 1 });
IncidentSchema.index({ 'aiMetadata.classificationScore': -1 });
```

### **File: `src/ai/schemas/indexed-document.schema.ts`**

Track các documents đã được indexed vào Qdrant:

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class IndexedDocument extends Document {
  @Prop({ required: true, unique: true })
  vectorId: string; // ID trong Qdrant

  @Prop({ required: true })
  sourceType: string; // 'incident', 'sop', 'faq', 'facility', 'policy'

  @Prop({ required: true })
  sourceId: string; // MongoDB _id của document gốc

  @Prop({ required: true })
  content: string; // Text đã được indexed

  @Prop({ type: Object })
  metadata: {
    title?: string;
    url?: string;
    page?: number;
    category?: string;
    tags?: string[];
    lastModified?: Date;
  };

  @Prop({ type: Number, default: 768 })
  embeddingDimension: number;

  @Prop({ type: Date })
  lastSyncedAt: Date;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const IndexedDocumentSchema =
  SchemaFactory.createForClass(IndexedDocument);

// Indexes
IndexedDocumentSchema.index({ sourceType: 1, sourceId: 1 });
IndexedDocumentSchema.index({ vectorId: 1 }, { unique: true });
IndexedDocumentSchema.index({ isActive: 1, sourceType: 1 });
```

---

## 🔧 BƯỚC 4: IMPLEMENT GEMINI SERVICE

**File: `src/ai/services/gemini.service.ts`**

Tạo service wrapper cho Gemini API với các yêu cầu:

1. Support cả chat completion và embedding
2. Có retry logic khi API fail
3. Track token usage
4. Cache embedding results (Redis)
5. Handle rate limiting

Features cần có:

```typescript
@Injectable()
export class GeminiService {
  // Khởi tạo Gemini client
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {}

  // Generate single embedding
  async generateEmbedding(text: string): Promise<number[]>;

  // Batch generate embeddings (tối ưu cost)
  async batchGenerateEmbeddings(texts: string[]): Promise<number[][]>;

  // Chat completion
  async chatCompletion(
    messages: Array<{ role: string; content: string }>,
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<{
    content: string;
    usage: { promptTokens: number; completionTokens: number };
  }>;

  // RAG-specific chat với context
  async chatWithContext(
    query: string,
    context: string,
    systemPrompt: string,
  ): Promise<{ answer: string; usage: any }>;

  // Retry logic với exponential backoff
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
  ): Promise<T>;
}
```

Config:

- Model embedding: `text-embedding-004` (768 dimensions)
- Model chat: `gemini-2.0-flash-exp` (nhanh, rẻ) hoặc `gemini-1.5-pro` (thông minh hơn)
- Temperature: 0.3 cho RAG, 0.7 cho chat thường
- Cache embedding trong Redis: TTL 7 ngày

---

## 🗄️ BƯỚC 5: IMPLEMENT QDRANT SERVICE

**File: `src/ai/services/qdrant.service.ts`**

Tạo service quản lý Qdrant với:

1. Initialize collection với config:
   - Collection name: `iuh_csvc_knowledge`
   - Vector size: 768 (theo Gemini embedding)
   - Distance: Cosine
2. CRUD operations:
   - `upsertDocument(id, vector, payload)`: Insert/update vector
   - `search(query, options)`: Search với filter support
   - `deleteDocument(id)`: Xóa vector
   - `getDocument(id)`: Lấy document theo ID
   - `batchUpsert(points[])`: Batch insert cho performance
3. Collection management:
   - `createCollection()`: Tạo collection nếu chưa có
   - `collectionExists()`: Check collection
   - `getCollectionInfo()`: Thông tin collection
4. Health check connection

```typescript
@Injectable()
export class QdrantService {
  private client: QdrantClient;
  private readonly collectionName = 'iuh_csvc_knowledge';

  constructor(private configService: ConfigService) {
    this.client = new QdrantClient({
      url: this.configService.get('QDRANT_URL'),
    });
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  async ensureCollection(): Promise<void> {
    // Tạo collection nếu chưa tồn tại
  }

  async upsertDocument(
    id: string,
    vector: number[],
    payload: Record<string, any>,
  ): Promise<void>;

  async search(
    queryVector: number[],
    options: {
      limit?: number;
      scoreThreshold?: number;
      filter?: Record<string, any>;
    },
  ): Promise<Array<{ id: string; score: number; payload: any }>>;

  async deleteDocument(id: string): Promise<void>;

  async batchUpsert(
    points: Array<{ id: string; vector: number[]; payload: any }>,
  ): Promise<void>;
}
```

---

## 🔄 BƯỚC 6: IMPLEMENT SYNC SERVICE

**File: `src/ai/services/sync.service.ts`**

Service đồng bộ MongoDB ↔ Qdrant:

```typescript
@Injectable()
export class SyncService {
  constructor(
    private qdrantService: QdrantService,
    private geminiService: GeminiService,
    private indexingQueue: Queue,
    @InjectModel(IndexedDocument.name)
    private indexedDocModel: Model<IndexedDocument>,
  ) {}

  // Sync incident khi mới tạo
  async onIncidentCreated(incident: Incident): Promise<void> {
    const vectorId = incident._id.toString();

    // Add vào queue để xử lý async
    await this.indexingQueue.add('index-incident', {
      vectorId,
      sourceType: 'incident',
      sourceId: incident._id.toString(),
      text: `${incident.description}\nĐịa điểm: ${incident.location}`,
      metadata: {
        category: incident.category,
        priority: incident.priority,
        location: incident.location,
        createdAt: incident.createdAt,
      },
    });
  }

  // Sync incident khi update
  async onIncidentUpdated(incident: Incident): Promise<void> {
    // Chỉ update metadata, không re-generate embedding
    const vectorId = incident.vectorId || incident._id.toString();

    await this.qdrantService.updatePayload(vectorId, {
      category: incident.category,
      priority: incident.priority,
      status: incident.status,
      updatedAt: new Date(),
    });

    // Update trong IndexedDocument collection
    await this.indexedDocModel.updateOne(
      { vectorId },
      {
        $set: {
          lastSyncedAt: new Date(),
          'metadata.category': incident.category,
          'metadata.priority': incident.priority,
        },
      },
    );
  }

  // Sync incident khi delete
  async onIncidentDeleted(incidentId: string): Promise<void> {
    const vectorId = incidentId;

    await this.qdrantService.deleteDocument(vectorId);

    await this.indexedDocModel.updateOne(
      { vectorId },
      { $set: { isActive: false } },
    );
  }

  // Bulk sync toàn bộ incidents (dùng khi khởi tạo)
  async syncAllIncidents(): Promise<{ indexed: number; failed: number }> {
    // Implementation
  }

  // Re-index document bị lỗi
  async reindexDocument(vectorId: string): Promise<void> {
    // Implementation
  }
}
```

---

## 🧠 BƯỚC 7: IMPLEMENT RAG SERVICE

**File: `src/ai/services/rag.service.ts`**

Core RAG service với flow:

1. Nhận query từ user
2. Generate embedding cho query
3. Search Qdrant (topK=8, minScore=0.7)
4. Assemble context từ results
5. Tạo prompt với context
6. Gọi Gemini chat completion
7. Trả về answer + sources
8. Cache kết quả (30 phút trong Redis)

```typescript
@Injectable()
export class RAGService {
  constructor(
    private geminiService: GeminiService,
    private qdrantService: QdrantService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async query(
    query: string,
    options?: {
      sourceTypes?: string[];
      topK?: number;
      minScore?: number;
    },
  ): Promise<RAGSearchResult> {
    // 1. Check cache
    const cacheKey = `rag:${query}:${JSON.stringify(options)}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    // 2. Generate query embedding
    const queryVector = await this.geminiService.generateEmbedding(query);

    // 3. Search Qdrant
    const searchResults = await this.qdrantService.search(queryVector, {
      limit: options?.topK || 8,
      scoreThreshold: options?.minScore || 0.7,
      filter: options?.sourceTypes
        ? { sourceType: { $in: options.sourceTypes } }
        : undefined,
    });

    // 4. Assemble context
    const context = this.assembleContext(searchResults);

    // 5. Generate answer
    const systemPrompt = this.getSystemPrompt();
    const { answer, usage } = await this.geminiService.chatWithContext(
      query,
      context,
      systemPrompt,
    );

    const result = {
      answer,
      sources: searchResults.map((r) => ({
        id: r.id,
        score: r.score,
        content: r.payload.content,
        metadata: r.payload.metadata,
      })),
      usage,
    };

    // 6. Cache result
    await this.cacheManager.set(cacheKey, result, 1800); // 30 phút

    return result;
  }

  // Specialized methods
  async chatFAQ(query: string): Promise<RAGSearchResult> {
    return this.query(query, { sourceTypes: ['faq'] });
  }

  async searchFacilities(query: string): Promise<RAGSearchResult> {
    return this.query(query, { sourceTypes: ['facility'] });
  }

  async searchSOPs(query: string): Promise<RAGSearchResult> {
    return this.query(query, { sourceTypes: ['sop', 'policy'] });
  }

  private assembleContext(results: any[]): string {
    // Format context từ search results
  }

  private getSystemPrompt(): string {
    return `
Bạn là trợ lý AI thông minh của Trường Đại học Công nghiệp TP.HCM (IUH), 
chuyên hỗ trợ về quản lý cơ sở vật chất.

NHIỆM VỤ:
- Trả lời câu hỏi dựa trên thông tin trong CONTEXT được cung cấp
- Nếu không tìm thấy thông tin, hãy nói rõ và đề xuất liên hệ bộ phận hỗ trợ
- Giữ giọng điệu thân thiện, chuyên nghiệp
- Trả lời bằng tiếng Việt

CHÚ Ý:
- KHÔNG bịa đặt thông tin không có trong CONTEXT
- Trích dẫn nguồn khi trả lời
- Nếu không chắc chắn, hãy thừa nhận và đưa ra gợi ý thay thế
    `.trim();
  }
}

interface RAGSearchResult {
  answer: string;
  sources: Array<{
    id: string;
    score: number;
    content: string;
    metadata: any;
  }>;
  usage: any;
}
```

---

## 🏷️ BƯỚC 8: IMPLEMENT CLASSIFICATION SERVICE

**File: `src/ai/services/classification.service.ts`**

AI phân loại sự cố tự động:

**Categories:**

- DIEN (Điện)
- NUOC (Nước)
- MANG (Mạng/Internet)
- NOI_THAT (Nội thất)
- DIEU_HOA (Điều hòa)
- VE_SINH (Vệ sinh)
- AN_NINH (An ninh)
- KHAC (Khác)

**Priorities:**

- CRITICAL (Nguy hiểm, cần xử lý gấp)
- HIGH (Quan trọng)
- MEDIUM (Trung bình)
- LOW (Thấp)

````typescript
@Injectable()
export class ClassificationService {
  constructor(
    private geminiService: GeminiService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async classifyIncident(
    description: string,
    location?: string,
  ): Promise<ClassificationResult> {
    // Tạo prompt cho Gemini
    const prompt = this.buildClassificationPrompt(description, location);

    // Call Gemini với temperature thấp (0.2) để consistent
    const response = await this.geminiService.chatCompletion(
      [{ role: 'user', content: prompt }],
      { temperature: 0.2, maxTokens: 500 },
    );

    // Parse JSON response
    const classification = JSON.parse(
      response.content.replace(/```json\n?|\n?```/g, '').trim(),
    );

    return {
      category: classification.category,
      priority: classification.priority,
      suggestedStaffSkills: classification.suggestedStaffSkills || [],
      estimatedDuration: classification.estimatedDuration || 60,
      reasoning: classification.reasoning,
      confidence: classification.confidence || 0.8,
    };
  }

  async suggestStaff(
    classification: ClassificationResult,
    availableStaff: any[],
  ): Promise<StaffSuggestion[]> {
    // AI ranking staff dựa trên skills, workload, location
  }

  private buildClassificationPrompt(
    description: string,
    location?: string,
  ): string {
    return `
Bạn là hệ thống AI phân loại sự cố tại Trường Đại học Công nghiệp TP.HCM.

MÔ TÁ SỰ CỐ:
${description}

${location ? `ĐỊA ĐIỂM: ${location}` : ''}

YÊU CẦU: Phân tích và trả về JSON với format:
{
  "category": "DIEN|NUOC|MANG|NOI_THAT|DIEU_HOA|VE_SINH|AN_NINH|KHAC",
  "priority": "CRITICAL|HIGH|MEDIUM|LOW",
  "suggestedStaffSkills": ["skill1", "skill2"],
  "estimatedDuration": 60,
  "reasoning": "Lý do phân loại",
  "confidence": 0.85
}

HƯỚNG DẪN PHÂN LOẠI:
- CRITICAL: Nguy hiểm tính mạng, cháy nổ, điện giật, nước tràn lớn
- HIGH: Ảnh hưởng nhiều người, phòng học/phòng lab
- MEDIUM: Ảnh hưởng ít người, không gấp
- LOW: Vấn đề nhỏ, không cần xử lý ngay

CHỈ TRẢ VỀ JSON, KHÔNG THÊM TEXT KHÁC.
    `.trim();
  }
}

interface ClassificationResult {
  category: string;
  priority: string;
  suggestedStaffSkills: string[];
  estimatedDuration: number;
  reasoning: string;
  confidence: number;
}

interface StaffSuggestion {
  staffId: string;
  name: string;
  matchScore: number;
  reasons: string[];
}
````

---

## 📥 BƯỚC 9: IMPLEMENT INDEXING QUEUE

**File: `src/ai/queues/indexing.processor.ts`**

BullMQ worker xử lý indexing:

```typescript
@Processor('indexing')
export class IndexingProcessor {
  private readonly logger = new Logger(IndexingProcessor.name);

  constructor(
    private geminiService: GeminiService,
    private qdrantService: QdrantService,
    @InjectModel(IndexedDocument.name)
    private indexedDocModel: Model<IndexedDocument>,
  ) {}

  @Process('index-incident')
  async handleIndexIncident(job: Job) {
    const { vectorId, sourceType, sourceId, text, metadata } = job.data;

    try {
      // 1. Generate embedding
      this.logger.log(`Generating embedding for ${vectorId}...`);
      const embedding = await this.geminiService.generateEmbedding(text);

      // 2. Upsert vào Qdrant
      await this.qdrantService.upsertDocument(vectorId, embedding, {
        sourceType,
        sourceId,
        content: text.substring(0, 500), // Lưu preview
        ...metadata,
      });

      // 3. Lưu tracking vào MongoDB
      await this.indexedDocModel.findOneAndUpdate(
        { vectorId },
        {
          vectorId,
          sourceType,
          sourceId,
          content: text,
          metadata,
          embeddingDimension: 768,
          lastSyncedAt: new Date(),
          isActive: true,
        },
        { upsert: true },
      );

      this.logger.log(`✓ Indexed ${vectorId} successfully`);

      return { success: true, vectorId };
    } catch (error) {
      this.logger.error(`✗ Failed to index ${vectorId}:`, error);
      throw error; // BullMQ sẽ retry
    }
  }

  @Process('batch-index')
  async handleBatchIndex(job: Job) {
    const { documents } = job.data; // Array of {vectorId, text, metadata}

    const texts = documents.map((d) => d.text);
    const embeddings = await this.geminiService.batchGenerateEmbeddings(texts);

    const points = documents.map((doc, i) => ({
      id: doc.vectorId,
      vector: embeddings[i],
      payload: {
        sourceType: doc.sourceType,
        content: doc.text.substring(0, 500),
        ...doc.metadata,
      },
    }));

    await this.qdrantService.batchUpsert(points);

    // Bulk insert vào MongoDB
    const operations = documents.map((doc, i) => ({
      updateOne: {
        filter: { vectorId: doc.vectorId },
        update: {
          $set: {
            vectorId: doc.vectorId,
            sourceType: doc.sourceType,
            sourceId: doc.sourceId,
            content: doc.text,
            metadata: doc.metadata,
            embeddingDimension: 768,
            lastSyncedAt: new Date(),
            isActive: true,
          },
        },
        upsert: true,
      },
    }));

    await this.indexedDocModel.bulkWrite(operations);

    return { success: true, count: documents.length };
  }
}
```

**File: `src/ai/queues/indexing.queue.ts`**

```typescript
@Injectable()
export class IndexingQueueService {
  constructor(@InjectQueue('indexing') private indexingQueue: Queue) {}

  async addIndexJob(data: {
    vectorId: string;
    sourceType: string;
    sourceId: string;
    text: string;
    metadata: any;
  }) {
    return this.indexingQueue.add('index-incident', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  async addBatchIndexJob(documents: any[]) {
    return this.indexingQueue.add(
      'batch-index',
      { documents },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );
  }

  async getJobStatus(jobId: string) {
    const job = await this.indexingQueue.getJob(jobId);
    return {
      id: job.id,
      state: await job.getState(),
      progress: job.progress(),
      failedReason: job.failedReason,
    };
  }
}
```

---

## 🌐 BƯỚC 10: IMPLEMENT CONTROLLERS

### **File: `src/ai/controllers/chat.controller.ts`**

```typescript
@Controller('ai/chat')
@UseGuards(JwtAuthGuard)
@UseInterceptors(CacheInterceptor)
export class ChatController {
  constructor(private ragService: RAGService) {}

  @Post()
  @UsePipes(new ValidationPipe())
  async chat(@Body() dto: ChatDto, @Request() req) {
    const result = await this.ragService.query(dto.query);

    return {
      success: true,
      data: {
        answer: result.answer,
        sources: result.sources,
        conversationId: dto.conversationId,
      },
      meta: {
        usage: result.usage,
        timestamp: new Date(),
        userId: req.user.id,
      },
    };
  }

  @Get('faq')
  async searchFAQ(@Query('q') query: string) {
    return this.ragService.chatFAQ(query);
  }

  @Get('facilities')
  async searchFacilities(@Query('q') query: string) {
    return this.ragService.searchFacilities(query);
  }

  @Get('sop')
  async searchSOPs(@Query('q') query: string) {
    return this.ragService.searchSOPs(query);
  }
}
```

**DTO: `src/ai/dtos/chat.dto.ts`**

```typescript
import { IsString, IsOptional, IsUUID, MinLength } from 'class-validator';

export class ChatDto {
  @IsString()
  @MinLength(3, { message: 'Câu hỏi phải có ít nhất 3 ký tự' })
  query: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;
}
```

### **File: `src/ai/controllers/classification.controller.ts`**

```typescript
@Controller('ai/classify')
@UseGuards(JwtAuthGuard)
export class ClassificationController {
  constructor(
    private classificationService: ClassificationService,
    @InjectModel(Incident.name) private incidentModel: Model<Incident>,
  ) {}

  @Post('incident')
  async classifyIncident(@Body() dto: ClassifyIncidentDto) {
    const classification = await this.classificationService.classifyIncident(
      dto.description,
      dto.location,
    );

    return {
      success: true,
      data: classification,
    };
  }

  @Post('incident/:id/auto-classify')
  async autoClassifyAndUpdate(@Param('id') id: string) {
    const incident = await this.incidentModel.findById(id);
    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    const classification = await this.classificationService.classifyIncident(
      incident.description,
      incident.location,
    );

    // Update incident với AI classification
    await this.incidentModel.updateOne(
      { _id: id },
      {
        $set: {
          category: classification.category,
          priority: classification.priority,
          aiMetadata: {
            ...classification,
            autoClassified: true,
            classifiedAt: new Date(),
          },
        },
      },
    );

    return {
      success: true,
      data: classification,
    };
  }

  @Post('suggest-
```
