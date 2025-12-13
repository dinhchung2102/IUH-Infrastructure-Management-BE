# API Sync - Re-index Reports vào Qdrant

## Endpoint

**POST** `/api/ai/sync/reports`

**Authentication**: Required (JWT token)

**Description**: Re-index tất cả reports từ MongoDB vào Qdrant vector database

## Request

Không cần body, chỉ cần gọi endpoint.

**Headers**:
```
Authorization: Bearer <jwt_token>
```

## Response

```json
{
  "success": true,
  "message": "Đã queue X reports để index. Y reports thất bại.",
  "data": {
    "indexed": number,  // Số reports đã queue thành công
    "failed": number    // Số reports thất bại
  }
}
```

## Lưu ý

- Indexing chạy async qua BullMQ queue
- Reports được xử lý theo batch (50 reports/batch)
- Có thể mất vài phút để index hết tất cả reports
- Kiểm tra status qua `GET /api/ai/sync/status`

## Kiểm tra Status

**GET** `/api/ai/sync/status`

**Response**:
```json
{
  "success": true,
  "data": {
    "queue": {
      "waiting": number,    // Số jobs đang chờ
      "active": number,     // Số jobs đang xử lý
      "completed": number,  // Số jobs đã hoàn thành
      "failed": number      // Số jobs thất bại
    }
  }
}
```

