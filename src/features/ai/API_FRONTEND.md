# AI Chat API - Hướng dẫn cho Frontend

## Endpoint

**POST** `/api/ai/chat`

**Authentication**: Required (JWT token trong header)

## Request

```json
{
  "query": "string", // Câu hỏi của user (required, 3-500 ký tự)
  "sourceTypes": ["string"] // Optional: Filter theo loại ["faq", "general", "report", ...]
}
```

**Headers**:

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Response

```json
{
  "success": true,
  "data": {
    "answer": "string",        // Câu trả lời từ AI
    "sourcesCount": number     // Số lượng sources được sử dụng
  },
  "meta": {
    "usage": {
      "promptTokens": number,
      "completionTokens": number
    },
    "timestamp": "ISO string"
  }
}
```

## Lưu ý

- Conversation history được tự động lưu theo user ID từ token
- Không cần truyền `conversationId` trong request
- Mỗi user có conversation history riêng, tự động duy trì context
- History được lưu 24 giờ, tối đa 10 messages gần nhất

## Error Response

```json
{
  "success": false,
  "message": "Error message",
  "statusCode": number
}
```
