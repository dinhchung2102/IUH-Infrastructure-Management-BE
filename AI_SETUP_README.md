# 🤖 AI RAG Integration - Setup Guide

## ✅ Đã Hoàn Thành

### 1. Dependencies
- ✅ @google/generative-ai (Gemini API)
- ✅ @qdrant/js-client-rest (Vector DB)
- ✅ bullmq + ioredis (Queue system)

### 2. Docker Setup
- ✅ Dockerfile cho production build
- ✅ docker-compose.yml với Qdrant service
- ✅ .dockerignore

### 3. AI Services
- ✅ `GeminiService`: Wrapper cho Gemini API (embedding + chat)
- ✅ `QdrantService`: Vector DB operations
- ✅ `RAGService`: Core RAG logic với context search
- ✅ `ClassificationService`: AI phân loại report tự động
- ✅ `SyncService`: Đồng bộ MongoDB ↔ Qdrant

### 4. Queue System
- ✅ `IndexingProcessor`: BullMQ worker cho background indexing
- ✅ Queue support batch và single document indexing

### 5. API Endpoints
- ✅ `POST /api/ai/chat` - RAG chat với context
- ✅ `GET /api/ai/chat/faq` - Search FAQ
- ✅ `GET /api/ai/chat/facilities` - Search facilities/assets
- ✅ `GET /api/ai/chat/sop` - Search SOPs
- ✅ `GET /api/ai/chat/similar-reports` - Find similar reports
- ✅ `POST /api/ai/classify/report` - Phân loại report tự động
- ✅ `POST /api/ai/classify/suggest-priority` - Đề xuất priority

---

## 🚀 Hướng Dẫn Triển Khai

### Bước 1: Environment Variables

Thêm vào file `.env`:

```bash
# AI - Gemini
GEMINI_KEY=your_gemini_api_key_here

# AI - Qdrant Vector DB
QDRANT_URL=http://localhost:6333

# Redis (đã có sẵn)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Bước 2: Start Qdrant với Docker

```bash
# Start Qdrant only
docker-compose up -d qdrant

# Hoặc start tất cả services
docker-compose up -d
```

### Bước 3: Build và Run Application

```bash
# Development
npm run dev

# Production
npm run build
npm run start:prod

# Hoặc dùng Docker
docker-compose up app
```

### Bước 4: Verify Services

```bash
# Check Qdrant
curl http://localhost:6333/collections

# Check API Health
curl http://localhost:3000/api/health
```

---

## 📊 Indexing Data (Khi Đã Có Data)

### Option 1: Tự động index khi tạo report mới
Code đã sẵn sàng tự động index khi:
- Report được tạo → `SyncService.onReportCreated()`
- Report được update → `SyncService.onReportUpdated()`
- Report được xóa → `SyncService.onReportDeleted()`

### Option 2: Bulk sync toàn bộ reports hiện có

Tạo endpoint admin để bulk sync:

```typescript
// Trong report.controller.ts hoặc tạo admin controller riêng
@Post('admin/sync-reports')
@UseGuards(AdminGuard)
async syncAllReports() {
  const result = await this.syncService.syncAllReports(this.reportModel);
  return { success: true, ...result };
}
```

Gọi API:
```bash
POST http://localhost:3000/api/admin/sync-reports
Authorization: Bearer <admin_token>
```

---

## 🔍 Usage Examples

### 1. RAG Chat
```bash
POST /api/ai/chat
{
  "query": "Làm sao để báo cáo sự cố điện?",
  "conversationId": "optional-uuid"
}
```

### 2. Phân loại Report
```bash
POST /api/ai/classify/report
{
  "description": "Đèn trong phòng A101 bị hỏng, không sáng",
  "location": "A101"
}

Response:
{
  "success": true,
  "data": {
    "category": "DIEN",
    "priority": "MEDIUM",
    "suggestedStaffSkills": ["electrician"],
    "estimatedDuration": 30,
    "reasoning": "...",
    "confidence": 0.92
  }
}
```

### 3. Search Similar Reports
```bash
GET /api/ai/chat/similar-reports?q=điện+bị+hỏng
```

---

## 📁 Cấu Trúc Source Types

Documents được phân loại theo `sourceType`:

- `report` - Báo cáo sự cố
- `asset` - Thông tin tài sản
- `sop` - Standard Operating Procedures
- `faq` - Frequently Asked Questions
- `policy` - Policies và quy định
- `facility` - Thông tin cơ sở vật chất

---

## 🔧 Troubleshooting

### Qdrant không kết nối được
```bash
# Check Qdrant container
docker ps | grep qdrant

# Check logs
docker logs iuh-qdrant

# Restart
docker-compose restart qdrant
```

### Queue jobs không chạy
```bash
# Check Redis connection
redis-cli ping

# Check BullMQ dashboard (optional)
npm install -g bull-board
```

### Gemini API errors
- Kiểm tra `GEMINI_KEY` trong .env
- Verify API key tại: https://makersuite.google.com/app/apikey
- Check quota limits

---

## 📝 TODO: Khi Có Data

1. ✅ Code đã sẵn sàng
2. ⏳ Prepare training data (FAQs, SOPs, Policies)
3. ⏳ Bulk sync existing reports
4. ⏳ Test RAG accuracy
5. ⏳ Fine-tune prompts nếu cần
6. ⏳ Monitor và optimize

---

## 🎯 Next Steps

1. **Index Documents**: Bulk sync reports và documents khác
2. **Test RAG**: Thử các câu hỏi và đánh giá độ chính xác
3. **Integrate FE**: Kết nối với frontend admin
4. **Monitor**: Track usage và costs (Gemini API)
5. **Optimize**: Fine-tune prompts dựa trên feedback

---

**Ghi chú**: Code đã production-ready, chỉ cần có data là chạy được ngay!

