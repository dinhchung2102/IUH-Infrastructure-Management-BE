# Hướng Dẫn Sync Data Vào Qdrant cho AI Chatbot

## Tổng Quan

Để AI chatbot hoạt động, cần sync data (reports) vào Qdrant vector database. Hệ thống sẽ:
1. Generate embeddings cho mỗi report
2. Lưu vào Qdrant để search tương tự
3. Track sync status trong MongoDB

## Yêu Cầu

### 1. Qdrant Server Phải Chạy

Kiểm tra Qdrant có chạy không:
```bash
# Check Qdrant health
curl http://localhost:6333/healthz
# hoặc
curl http://your-qdrant-server:6333/healthz
```

Nếu chưa chạy, cần start Qdrant server trước.

### 2. Redis Server Phải Chạy (cho BullMQ Queue)

```bash
# Check Redis
redis-cli ping
# Nếu có password:
redis-cli -a your_password ping
```

### 3. File .env Cần Có

```env
# Qdrant Config
QDRANT_URL=http://localhost:6333
# hoặc
QDRANT_URL=http://your-qdrant-server:6333

# Gemini API (để generate embeddings)
GEMINI_API_KEY=your_gemini_api_key

# Redis Config (cho Queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password_if_needed
```

## API Endpoints

### 1. Kiểm Tra Queue Status

**GET** `/api/ai/sync/status`

**Headers:**
```
Authorization: Bearer <your_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "queue": {
      "waiting": 0,
      "active": 0,
      "completed": 150,
      "failed": 2
    },
    "message": "Use POST /api/ai/sync/reports to start indexing"
  }
}
```

### 2. Sync All Reports (Bulk Sync)

**POST** `/api/ai/sync/reports`

**Headers:**
```
Authorization: Bearer <your_token>
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

## Quy Trình Sync Data

### Bước 1: Kiểm Tra Qdrant

```bash
# Check Qdrant server
curl http://localhost:6333/healthz

# Xem collections hiện có
curl http://localhost:6333/collections
```

### Bước 2: Kiểm Tra Queue Status

```bash
curl -X GET http://localhost:3000/api/ai/sync/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Bước 3: Sync All Reports

```bash
curl -X POST http://localhost:3000/api/ai/sync/reports \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Bước 4: Monitor Progress

Tiếp tục gọi status endpoint để theo dõi:

```bash
# Kiểm tra mỗi 5 giây
while true; do
  curl -X GET http://localhost:3000/api/ai/sync/status \
    -H "Authorization: Bearer YOUR_TOKEN"
  sleep 5
done
```

Quan sát:
- `waiting`: Số jobs đang chờ xử lý
- `active`: Số jobs đang xử lý
- `completed`: Số jobs đã hoàn thành
- `failed`: Số jobs thất bại

### Bước 5: Verify Data Trong Qdrant

```bash
# Kiểm tra collection info
curl http://localhost:6333/collections/iuh_csvc_knowledge

# Expected response:
# {
#   "result": {
#     "status": "green",
#     "vectors_count": 150,
#     ...
#   }
# }
```

## Auto-Sync (Tự Động)

Sau khi sync lần đầu, hệ thống sẽ **tự động sync** khi:

### 1. Tạo Report Mới
- Tự động queue để index vào Qdrant
- Không cần gọi API sync

### 2. Cập Nhật Report
- Tự động update metadata trong Qdrant
- Không re-generate embedding (tiết kiệm chi phí)

### 3. Xóa Report
- Tự động xóa khỏi Qdrant
- Mark inactive trong MongoDB tracking

## Troubleshooting

### Lỗi: "ECONNREFUSED" (Qdrant)

**Nguyên nhân:** Qdrant server không chạy hoặc URL sai

**Giải pháp:**
1. Kiểm tra Qdrant server:
   ```bash
   docker ps | grep qdrant
   # hoặc
   systemctl status qdrant
   ```

2. Start Qdrant nếu chưa chạy:
   ```bash
   docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
   ```

3. Kiểm tra `QDRANT_URL` trong .env

### Lỗi: "Bad Request" (Qdrant)

**Nguyên nhân:** Collection chưa được tạo hoặc vector size không khớp

**Giải pháp:**
1. Kiểm tra collection có tồn tại:
   ```bash
   curl http://localhost:6333/collections/iuh_csvc_knowledge
   ```

2. Nếu collection không tồn tại, tạo thủ công:
   ```bash
   curl -X PUT http://localhost:6333/collections/iuh_csvc_knowledge \
     -H "Content-Type: application/json" \
     -d '{
       "vectors": {
         "size": 768,
         "distance": "Cosine"
       }
     }'
   ```

3. Restart server để recreate collection:
   ```bash
   pm2 restart 3000:csvc_iuh
   ```

4. Verify collection được tạo:
   ```bash
   curl http://localhost:6333/collections/iuh_csvc_knowledge
   # Should return: "status": "green", "vectors_count": 0
   ```

### Lỗi: "NOAUTH" (Redis)

**Nguyên nhân:** Redis yêu cầu password

**Giải pháp:**
- Thêm `REDIS_PASSWORD` vào .env

### Lỗi: "API key not valid"

**Nguyên nhân:** Gemini API key sai hoặc không có

**Giải pháp:**
1. Lấy API key tại: https://makersuite.google.com/app/apikey
2. Thêm vào .env: `GEMINI_API_KEY=your_key`

### Queue Bị Stuck

**Giải pháp:**
1. Kiểm tra Redis logs
2. Restart server để reset queue:
   ```bash
   pm2 restart 3000:csvc_iuh
   ```

## Testing Chat Sau Khi Sync

Sau khi sync xong, test chatbot:

### 1. Chat API

**POST** `/api/ai/chat`

```json
{
  "query": "Có báo cáo nào về điện bị hỏng không?",
  "sourceTypes": ["report"]
}
```

### 2. Search Similar Reports

**GET** `/api/ai/chat/similar-reports?q=điện bị hỏng`

### 3. FAQ Search

**GET** `/api/ai/chat/faq?q=làm sao để báo cáo sự cố`

## Performance Tips

### 1. Sync Lần Đầu
- Sync **một lần duy nhất** khi deploy
- Có thể mất 5-30 phút tùy số lượng reports
- Gemini API có rate limit: ~1500 requests/minute

### 2. Production Deployment
- Đảm bảo Qdrant persistent storage
- Backup Qdrant data định kỳ
- Monitor queue status

### 3. Cost Optimization
- Chỉ sync lại khi cần (data bị mất)
- Auto-sync tự động xử lý updates
- Không cần sync lại mỗi lần deploy

## File Structure

```
src/features/ai/
├── controllers/
│   ├── ai-chat.controller.ts      # Chat endpoints
│   ├── ai-sync.controller.ts      # Sync endpoints ⭐
│   └── ai-classification.controller.ts
├── services/
│   ├── sync.service.ts            # Sync logic
│   ├── qdrant.service.ts          # Qdrant operations
│   ├── gemini.service.ts          # Embedding generation
│   └── rag.service.ts             # RAG chat logic
├── processors/
│   └── indexing.processor.ts      # Background job processor
└── schemas/
    └── indexed-document.schema.ts # Tracking schema
```

## Summary

1. ✅ Đảm bảo Qdrant + Redis chạy
2. ✅ Config .env đầy đủ
3. ✅ Gọi `POST /api/ai/sync/reports` **MỘT LẦN**
4. ✅ Monitor progress qua `GET /api/ai/sync/status`
5. ✅ Test chat sau khi sync xong
6. ✅ Hệ thống tự động sync cho reports mới

**Lưu ý:** Chỉ cần sync **MỘT LẦN** ban đầu. Sau đó hệ thống tự động!

