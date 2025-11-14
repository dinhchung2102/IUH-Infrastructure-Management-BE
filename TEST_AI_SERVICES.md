# 🧪 Hướng Dẫn Test AI RAG Services

## ✅ Bước 1: Kiểm Tra Services

### 1.1. Qdrant (Đã chạy ✓)
```powershell
# Check Qdrant
curl http://localhost:6333/collections

# Response: {"result":{"collections":[]},"status":"ok"}
# Collection sẽ được tạo tự động khi app start
```

### 1.2. Redis (Đã chạy ✓)
```powershell
# Check Redis (nếu có redis-cli)
redis-cli ping
# Response: PONG
```

### 1.3. Start NestJS App
```bash
# Terminal 1: Start app
npm run dev

# Đợi app start xong, sẽ thấy:
# [Nest] Application is running on: http://localhost:3000
```

---

## 🧪 Bước 2: Test Các API Endpoints

### 2.1. Health Check (Không cần auth)
```bash
curl http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-11-14T09:32:31.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

---

### 2.2. Login để lấy Access Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"your_admin_email\",\"password\":\"your_password\"}"
```

**Response:**
```json
{
  "message": "Đăng nhập thành công",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "account": {...}
}
```

**Lưu token này để dùng cho các request sau:**
```bash
export TOKEN="your_access_token_here"
```

---

### 2.3. Test AI Classification (Phân loại Report)

```bash
curl -X POST http://localhost:3000/api/ai/classify/report \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"description\": \"Đèn trong phòng A101 bị hỏng, không sáng được\",
    \"location\": \"A101\"
  }"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "category": "DIEN",
    "priority": "MEDIUM",
    "suggestedStaffSkills": ["electrician"],
    "estimatedDuration": 30,
    "reasoning": "Sự cố về đèn chiếu sáng...",
    "confidence": 0.92
  },
  "message": "Phân loại báo cáo thành công"
}
```

---

### 2.4. Test AI Chat (RAG) - Cần có data trong Qdrant

**Lưu ý:** Endpoint này sẽ hoạt động tốt hơn khi đã có data được index vào Qdrant.

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"Làm sao để báo cáo sự cố điện?\"
  }"
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
        "metadata": {...}
      }
    ],
    "conversationId": null
  },
  "meta": {
    "usage": {
      "promptTokens": 150,
      "completionTokens": 50
    },
    "timestamp": "2024-11-14T09:32:31.000Z"
  }
}
```

**Nếu chưa có data:**
- Response vẫn sẽ có `answer` nhưng `sources` sẽ rỗng hoặc ít
- Cần index data vào Qdrant trước (xem bước 3)

---

### 2.5. Test AI Chat - FAQ Search

```bash
curl "http://localhost:3000/api/ai/chat/faq?q=Hướng dẫn báo cáo sự cố" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 2.6. Test AI Chat - Similar Reports

```bash
curl "http://localhost:3000/api/ai/chat/similar-reports?q=điện bị hỏng" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Bước 3: Kiểm Tra Qdrant Collection

Sau khi app chạy, collection sẽ được tạo tự động:

```bash
# Check collection
curl http://localhost:6333/collections/iuh_csvc_knowledge

# Response khi đã có collection:
{
  "result": {
    "points_count": 0,
    "vectors_count": 0,
    ...
  }
}
```

---

## 🔍 Bước 4: Test với PowerShell Script

Chạy script test tự động:

```powershell
.\test-ai-services.ps1
```

Script sẽ:
- ✓ Check Qdrant
- ✓ Check App health
- ✓ Check Collection
- ✓ Hiển thị hướng dẫn test endpoints

---

## 🐛 Troubleshooting

### Lỗi: "Qdrant connection failed"
```bash
# Check Qdrant container
docker ps | grep qdrant

# Restart Qdrant
docker-compose restart qdrant
```

### Lỗi: "401 Unauthorized"
- Kiểm tra token có đúng không
- Token có thể đã hết hạn (15 phút), cần login lại

### Lỗi: "Collection not found"
- Bình thường! Collection sẽ được tạo tự động khi:
  - App start lần đầu
  - Hoặc khi có document được index

### Lỗi: "No results found" trong RAG
- Chưa có data trong Qdrant
- Cần index reports/documents trước (xem AI_SETUP_README.md)

---

## ✅ Checklist Test

- [ ] Qdrant đang chạy (port 6333)
- [ ] Redis đang chạy (port 6379)
- [ ] App đang chạy (port 3000)
- [ ] Health check OK
- [ ] Login thành công, có token
- [ ] AI Classification hoạt động
- [ ] AI Chat hoạt động (có thể chưa có data)
- [ ] Qdrant collection được tạo tự động

---

## 📝 Next Steps

1. **Index Data**: Khi có data, dùng `SyncService.syncAllReports()` để index
2. **Test với Real Data**: Index một vài reports và test lại RAG
3. **Monitor**: Check logs để xem AI responses
4. **Optimize**: Fine-tune prompts nếu cần

---

**File hỗ trợ:**
- `test-ai-services.ps1` - PowerShell test script
- `test-ai-api.http` - REST Client file cho VS Code

