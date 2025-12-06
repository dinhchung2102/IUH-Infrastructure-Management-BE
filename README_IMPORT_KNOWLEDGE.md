# Hướng Dẫn Import Knowledge Vào Qdrant

## File Đã Chuẩn Bị

File `iuh_pqt_knowledge.json` đã được convert từ chunks sang format Knowledge Base với metadata thông minh.

## Cách Import

### Qua API (Production)

```bash
# Upload file vào server
curl -X POST http://your-server:3000/api/knowledge-base/import-file \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@iuh_pqt_knowledge.json"
```

### Qua Postman

1. POST `http://your-server:3000/api/knowledge-base/import-file`
2. Headers: `Authorization: Bearer YOUR_TOKEN`
3. Body → form-data
4. Key: `file`, Type: File
5. Value: Chọn `iuh_pqt_knowledge.json`
6. Send

## Kết Quả Mong Đợi

```json
{
  "message": "Tạo thành công 11 kiến thức",
  "data": {
    "count": 11,
    "items": [...]
  }
}
```

## Verify

```bash
# Check số lượng knowledge
curl http://your-server:3000/api/knowledge-base?type=GENERAL&category=department-info

# Check Qdrant points count
curl http://localhost:6333/collections/iuh_csvc_knowledge
# Expected: "points_count": 11
```

## Test Chatbot

```bash
curl -X POST http://your-server:3000/api/ai/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "phòng quản trị có nhiệm vụ gì?"}'
```

Expected response:

```json
{
  "success": true,
  "data": {
    "answer": "Phòng Quản trị có các nhiệm vụ chính:\n1. Quản lý thiết bị...\n2. Quản lý hệ thống điện...\n3. Quản lý cấp thoát nước...",
    "sourcesCount": 3
  }
}
```

## Nội Dung File

File chứa 11 knowledge items về Phòng Quản trị:

1. ✅ Thông tin liên hệ (địa chỉ, điện thoại, email)
2. ✅ Chức năng tổng quát
3. ✅ Quản lý thiết bị (điện, nước, công trình)
4. ✅ Quản lý cơ sở hạ tầng
5. ✅ Nhiệm vụ quản lý thiết bị
6. ✅ Nhiệm vụ quản lý hệ thống điện
7. ✅ Nhiệm vụ quản lý hệ thống cấp nước
8. ✅ Tổng hợp và báo cáo
9. ✅ Đầu tư và xây dựng
10. ✅ Quản lý đất đai và công trình
11. ✅ Xây dựng và phối hợp

Mỗi item có:

- Title rõ ràng
- Content chi tiết
- Type phù hợp (FAQ/SOP/GENERAL)
- Category cụ thể
- Tags liên quan trực tiếp

## Lưu Ý

- File đã được tối ưu cho RAG search
- Mỗi knowledge item tập trung vào 1 chủ đề cụ thể
- Tags và category giúp filter chính xác
- Content đầy đủ để AI có thể trả lời chi tiết
