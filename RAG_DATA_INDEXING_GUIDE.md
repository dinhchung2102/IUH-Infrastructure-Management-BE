# 📚 Hướng Dẫn Index Data cho RAG System

## 🎯 Tổng Quan

Hệ thống RAG hiện tại đã có đầy đủ code nhưng **chưa có data vector** trong Qdrant. File này hướng dẫn cách thêm data để hoàn thiện logic RAG.

---

## 📋 Các Loại Data Có Thể Index

### 1. **Reports** (Báo cáo sự cố)

- **Source Type**: `report`
- **Nguồn**: MongoDB collection `reports`
- **Tự động sync**: ✅ Khi tạo/cập nhật report mới

### 2. **SOPs** (Standard Operating Procedures)

- **Source Type**: `sop`
- **Nguồn**: Cần tạo collection/document riêng
- **Tự động sync**: ❌ Cần index thủ công

### 3. **FAQs** (Frequently Asked Questions)

- **Source Type**: `faq`
- **Nguồn**: Cần tạo collection/document riêng
- **Tự động sync**: ❌ Cần index thủ công

### 4. **Policies** (Chính sách, quy định)

- **Source Type**: `policy`
- **Nguồn**: Cần tạo collection/document riêng
- **Tự động sync**: ❌ Cần index thủ công

### 5. **Assets/Facilities** (Tài sản, cơ sở vật chất)

- **Source Type**: `asset` hoặc `facility`
- **Nguồn**: MongoDB collection `assets`
- **Tự động sync**: ❌ Cần index thủ công

---

## 🚀 Cách 1: Index Reports Tự Động (Đã có sẵn)

### Reports được tự động index khi:

- ✅ Tạo report mới → `SyncService.onReportCreated()`
- ✅ Cập nhật report → `SyncService.onReportUpdated()`
- ✅ Xóa report → `SyncService.onReportDeleted()`

### Sync tất cả Reports hiện có:

**Option A: Sử dụng API Endpoint (Đã có sẵn ✅)**

```bash
# 1. Check queue status
curl -X GET http://localhost:3000/api/ai/sync/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Trigger sync all reports
curl -X POST http://localhost:3000/api/ai/sync/reports \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "message": "Đã queue 150 reports để index. 0 reports thất bại.",
  "data": {
    "indexed": 150,
    "failed": 0
  }
}
```

**Option B: Chạy trực tiếp từ code**

Tạo script `scripts/sync-reports.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SyncService } from '../src/features/ai/services/sync.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(SyncService);

  console.log('Starting bulk sync of reports...');
  const result = await syncService.syncAllReports();
  console.log(`Completed: ${result.indexed} indexed, ${result.failed} failed`);

  await app.close();
}

bootstrap();
```

Chạy:

```bash
npx ts-node scripts/sync-reports.ts
```

---

## 🛠️ Cách 2: Index Data Thủ Công (SOPs, FAQs, Policies)

### Bước 1: Tạo Schema cho Data Mới

Tạo `src/features/ai/schemas/sop.schema.ts`:

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class SOP extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  category: string;

  @Prop([String])
  tags: string[];
}

export const SOPSchema = SchemaFactory.createForClass(SOP);
```

### Bước 2: Tạo Service để Index

Thêm method vào `SyncService`:

```typescript
/**
 * Index SOP document
 */
async indexSOP(sop: any): Promise<void> {
  const vectorId = `sop_${sop._id}`;
  const text = `${sop.title}\n\n${sop.content}`;

  await this.indexingQueue.add('index-document', {
    vectorId,
    sourceType: 'sop',
    sourceId: String(sop._id),
    text,
    metadata: {
      title: sop.title,
      category: sop.category,
      tags: sop.tags || [],
    },
  });

  this.logger.log(`Queued SOP ${vectorId} for indexing`);
}

/**
 * Index FAQ document
 */
async indexFAQ(faq: any): Promise<void> {
  const vectorId = `faq_${faq._id}`;
  const text = `Câu hỏi: ${faq.question}\n\nTrả lời: ${faq.answer}`;

  await this.indexingQueue.add('index-document', {
    vectorId,
    sourceType: 'faq',
    sourceId: String(faq._id),
    text,
    metadata: {
      title: faq.question,
      category: faq.category,
    },
  });

  this.logger.log(`Queued FAQ ${vectorId} for indexing`);
}
```

### Bước 3: Tạo API Endpoint

Thêm vào `AISyncController`:

```typescript
@Post('sop/:id')
async indexSOP(@Param('id') id: string) {
  // Lấy SOP từ DB
  const sop = await this.sopModel.findById(id);
  if (!sop) {
    throw new NotFoundException('SOP not found');
  }

  await this.syncService.indexSOP(sop);
  return { success: true, message: 'SOP queued for indexing' };
}

@Post('faq/:id')
async indexFAQ(@Param('id') id: string) {
  const faq = await this.faqModel.findById(id);
  if (!faq) {
    throw new NotFoundException('FAQ not found');
  }

  await this.syncService.indexFAQ(faq);
  return { success: true, message: 'FAQ queued for indexing' };
}
```

---

## 📝 Cách 3: Index Data từ File/CSV

### Tạo Script Import

Tạo `scripts/import-sops.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SyncService } from '../src/features/ai/services/sync.service';
import * as fs from 'fs';
import * as csv from 'csv-parser';

interface SOPRow {
  title: string;
  content: string;
  category: string;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(SyncService);

  const sops: SOPRow[] = [];

  // Đọc CSV
  fs.createReadStream('data/sops.csv')
    .pipe(csv())
    .on('data', (row) => sops.push(row))
    .on('end', async () => {
      console.log(`Found ${sops.length} SOPs to index`);

      for (const sop of sops) {
        await syncService.indexSOP({
          _id: `sop_${Date.now()}_${Math.random()}`,
          ...sop,
        });
      }

      console.log('All SOPs queued for indexing');
      await app.close();
    });
}

bootstrap();
```

**File CSV mẫu** (`data/sops.csv`):

```csv
title,content,category
"Báo cáo sự cố điện","Bước 1: Gọi số hotline...","PROCEDURE"
"Hướng dẫn sử dụng phòng học","Bước 1: Đăng ký qua hệ thống...","GUIDE"
```

---

## 🔍 Kiểm Tra Data Đã Index

### 1. Check Queue Status (API)

```bash
curl -X GET http://localhost:3000/api/ai/sync/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "queue": {
      "waiting": 10,
      "active": 2,
      "completed": 150,
      "failed": 0
    }
  }
}
```

### 2. Check Qdrant Collection

```bash
# Check collection info
curl http://localhost:6333/collections/iuh_csvc_knowledge

# Response sẽ có:
# {
#   "result": {
#     "points_count": 150,  // Số documents đã index
#     "vectors_count": 150
#   }
# }
```

### 3. Check Indexed Documents trong MongoDB

```javascript
// MongoDB shell hoặc Compass
db.indexeddocuments.find().count();
db.indexeddocuments.find().limit(5);
```

### 4. Check Queue Logs

```bash
# Xem logs của indexing processor
docker logs iuh-csvc-api | grep "IndexingProcessor"
```

---

## 🧪 Test RAG Sau Khi Có Data

### 1. Test Chat với Context

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Làm sao để báo cáo sự cố điện?",
    "sourceTypes": ["report", "sop"]
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "answer": "Để báo cáo sự cố điện, bạn có thể...",
    "sources": [
      {
        "id": "...",
        "score": 0.85,
        "content": "...",
        "metadata": {
          "title": "Report DIEN",
          "category": "DIEN"
        }
      }
    ]
  }
}
```

### 2. Test Search Similar Reports

```bash
curl "http://localhost:3000/api/ai/chat/similar-reports?q=điện bị hỏng" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Test FAQ Search

```bash
curl "http://localhost:3000/api/ai/chat/faq?q=Hướng dẫn báo cáo sự cố" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Monitoring & Debugging

### 1. Check Queue Jobs

```typescript
// Trong code hoặc script
const queue = app.get(Queue, 'ai-indexing');
const jobs = await queue.getJobs(['waiting', 'active', 'completed', 'failed']);
console.log(`Waiting: ${jobs.filter((j) => j.state === 'waiting').length}`);
console.log(`Active: ${jobs.filter((j) => j.state === 'active').length}`);
console.log(`Completed: ${jobs.filter((j) => j.state === 'completed').length}`);
console.log(`Failed: ${jobs.filter((j) => j.state === 'failed').length}`);
```

### 2. Check Failed Jobs

```typescript
const failed = await queue.getFailed();
failed.forEach((job) => {
  console.log(`Job ${job.id} failed:`, job.failedReason);
});
```

### 3. Retry Failed Jobs

```typescript
const failed = await queue.getFailed();
for (const job of failed) {
  await job.retry();
}
```

---

## 🎯 Best Practices

### 1. **Batch Processing**

- Luôn dùng batch khi index nhiều documents
- Batch size: 50-100 documents
- Tránh overwhelm queue

### 2. **Error Handling**

- Queue có retry mechanism (3 attempts)
- Log errors để debug
- Có fallback khi index fail

### 3. **Data Quality**

- Format text rõ ràng trước khi index
- Include metadata quan trọng
- Remove HTML tags, special characters

### 4. **Performance**

- Index background (không block API)
- Monitor queue size
- Scale workers nếu cần

### 5. **Data Updates**

- Re-index khi content thay đổi
- Delete từ Qdrant khi source deleted
- Sync metadata changes

---

## 🔄 Workflow Hoàn Chỉnh

### Initial Setup:

1. ✅ Start Qdrant: `docker-compose up -d qdrant`
2. ✅ Start Redis: `docker-compose up -d redis`
3. ✅ Start App: `docker-compose up -d app`
4. ✅ Check services: `docker ps`

### Index Data:

1. **Reports**: Tự động hoặc trigger `POST /api/ai/sync/reports`
2. **SOPs/FAQs**: Tạo data → Index qua API hoặc script
3. **Verify**: Check Qdrant collection count

### Test RAG:

1. Test chat endpoint với query
2. Verify sources được trả về
3. Check answer quality

### Monitor:

1. Check queue status
2. Monitor failed jobs
3. Review logs

---

## 📚 Ví Dụ Data Mẫu

### SOP Mẫu:

```json
{
  "title": "Hướng dẫn báo cáo sự cố điện",
  "content": "Bước 1: Gọi số hotline 1900-xxxx\nBước 2: Cung cấp thông tin...",
  "category": "PROCEDURE",
  "tags": ["điện", "báo cáo", "sự cố"]
}
```

### FAQ Mẫu:

```json
{
  "question": "Làm sao để báo cáo sự cố?",
  "answer": "Bạn có thể báo cáo qua ứng dụng mobile hoặc web...",
  "category": "GENERAL"
}
```

---

## 🐛 Troubleshooting

### Lỗi: "Collection not found"

- **Nguyên nhân**: Collection chưa được tạo
- **Giải pháp**: Collection sẽ tự động tạo khi index document đầu tiên

### Lỗi: "Rate limit exceeded"

- **Nguyên nhân**: Quá nhiều requests đến Gemini API
- **Giải pháp**: Giảm batch size, thêm delay giữa các requests

### Lỗi: "Embedding dimension mismatch"

- **Nguyên nhân**: Model embedding thay đổi
- **Giải pháp**: Xóa collection và re-index tất cả

### Queue không process

- **Nguyên nhân**: Worker không chạy
- **Giải pháp**: Check `IndexingProcessor` đã được register trong module

---

## ✅ Checklist Hoàn Thành

- [ ] Qdrant đang chạy
- [ ] Redis đang chạy
- [ ] App đang chạy
- [ ] Index ít nhất 10-20 reports để test
- [ ] Test RAG chat endpoint
- [ ] Verify sources được trả về
- [ ] Check answer quality
- [ ] Monitor queue performance

---

## 📞 Support

Nếu gặp vấn đề:

1. Check logs: `docker logs iuh-csvc-api`
2. Check Qdrant: `curl http://localhost:6333/collections/iuh_csvc_knowledge`
3. Check Redis queue: Monitor BullMQ dashboard
4. Review code: `src/features/ai/services/sync.service.ts`

---

**Lưu ý**: Sau khi index data, RAG system sẽ hoạt động tốt hơn nhiều. Càng nhiều data chất lượng, càng có kết quả chính xác hơn! 🚀
