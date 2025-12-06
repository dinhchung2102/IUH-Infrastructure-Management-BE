# API Chatbot - Hướng Dẫn Frontend

## Tổng Quan

Hệ thống chatbot AI hỗ trợ nhiều loại tìm kiếm và phân loại thông minh sử dụng RAG (Retrieval-Augmented Generation) và Gemini AI.

## Authentication

Tất cả endpoints yêu cầu authentication token.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

---

## 1. General Chat (RAG)

Trò chuyện tổng quát với AI, tìm kiếm trong toàn bộ knowledge base.

### Endpoint

```
POST /api/ai/chat
```

### Request Body

```json
{
  "query": "Có báo cáo nào về điện bị hỏng không?",
  "conversationId": "conv-123",
  "sourceTypes": ["report"]
}
```

| Field            | Type     | Required | Description                                                   |
| ---------------- | -------- | -------- | ------------------------------------------------------------- |
| `query`          | string   | Yes      | Câu hỏi của user (3-500 ký tự)                                |
| `conversationId` | string   | No       | ID cuộc hội thoại (để tracking)                               |
| `sourceTypes`    | string[] | No       | Loại nguồn tìm kiếm: `["report", "faq", "sop", "facilities"]` |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "answer": "Có 3 báo cáo về sự cố điện gần đây. Báo cáo #1: Điện giật ở phòng 101...",
    "sources": [
      {
        "id": "693365bb3de3935071baf9bd",
        "type": "report",
        "score": 0.92,
        "content": "Điện giật ở phần gương...",
        "metadata": {
          "title": "Report DAMAGED",
          "category": "DAMAGED",
          "location": "Nhà vệ sinh H2",
          "status": "PENDING"
        }
      }
    ],
    "conversationId": "conv-123"
  },
  "meta": {
    "usage": {
      "promptTokens": 150,
      "completionTokens": 200
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 2. FAQ Search

Tìm kiếm câu hỏi thường gặp.

### Endpoint

```
GET /api/ai/chat/faq?q=<query>
```

### Query Parameters

| Parameter | Type   | Required | Description     |
| --------- | ------ | -------- | --------------- |
| `q`       | string | Yes      | Câu hỏi cần tìm |

### Request Example

```bash
GET /api/ai/chat/faq?q=làm sao để báo cáo sự cố
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "answer": "Để báo cáo sự cố, bạn có thể:\n1. Truy cập trang web...\n2. Quét QR code...",
    "sources": [
      {
        "id": "faq-001",
        "type": "faq",
        "score": 0.95,
        "content": "Hướng dẫn báo cáo sự cố...",
        "metadata": {
          "category": "reporting",
          "title": "Cách báo cáo sự cố"
        }
      }
    ]
  }
}
```

---

## 3. Facilities Search

Tìm kiếm thông tin về cơ sở vật chất.

### Endpoint

```
GET /api/ai/chat/facilities?q=<query>
```

### Query Parameters

| Parameter | Type   | Required | Description                         |
| --------- | ------ | -------- | ----------------------------------- |
| `q`       | string | Yes      | Thông tin cần tìm về cơ sở vật chất |

### Request Example

```bash
GET /api/ai/chat/facilities?q=phòng máy tính ở đâu
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "answer": "Phòng máy tính nằm ở tầng 3 tòa nhà A, cơ sở Nguyễn Văn Bảo...",
    "sources": [
      {
        "id": "facility-001",
        "type": "facilities",
        "score": 0.88,
        "content": "Phòng máy tính - Tầng 3 - Tòa A...",
        "metadata": {
          "building": "Tòa A",
          "floor": 3,
          "campus": "Nguyễn Văn Bảo"
        }
      }
    ]
  }
}
```

---

## 4. SOP Search

Tìm kiếm quy trình xử lý (Standard Operating Procedures).

### Endpoint

```
GET /api/ai/chat/sop?q=<query>
```

### Query Parameters

| Parameter | Type   | Required | Description       |
| --------- | ------ | -------- | ----------------- |
| `q`       | string | Yes      | Quy trình cần tìm |

### Request Example

```bash
GET /api/ai/chat/sop?q=xử lý sự cố điện
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "answer": "Quy trình xử lý sự cố điện:\n1. Ngắt nguồn điện ngay lập tức...\n2. Liên hệ bộ phận bảo trì...",
    "sources": [
      {
        "id": "sop-electrical",
        "type": "sop",
        "score": 0.91,
        "content": "SOP: Xử lý sự cố điện...",
        "metadata": {
          "category": "electrical",
          "priority": "CRITICAL"
        }
      }
    ]
  }
}
```

---

## 5. Similar Reports Search

Tìm các báo cáo tương tự.

### Endpoint

```
GET /api/ai/chat/similar-reports?q=<query>
```

### Query Parameters

| Parameter | Type   | Required | Description                         |
| --------- | ------ | -------- | ----------------------------------- |
| `q`       | string | Yes      | Mô tả sự cố để tìm báo cáo tương tự |

### Request Example

```bash
GET /api/ai/chat/similar-reports?q=điện giật ở nhà vệ sinh
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "answer": "Tìm thấy 2 báo cáo tương tự:\n\n1. Báo cáo #693365bb: Điện giật ở phần gương tại nhà vệ sinh H2...\n2. Báo cáo #692234aa: Sự cố điện tại khu vực WC...",
    "sources": [
      {
        "id": "693365bb3de3935071baf9bd",
        "type": "report",
        "score": 0.94,
        "content": "Loại báo cáo: DAMAGED\nMô tả: Điện giật ở phần gương...",
        "metadata": {
          "title": "Report DAMAGED",
          "category": "DAMAGED",
          "location": "Nhà vệ sinh H2",
          "status": "PENDING",
          "createdAt": "2024-12-05T06:36:06.510Z"
        }
      }
    ]
  }
}
```

---

## 6. Classify Report (Auto-Categorize)

Phân loại báo cáo tự động bằng AI.

### Endpoint

```
POST /api/ai/classify/report
```

### Request Body

```json
{
  "description": "Điện giật ở phần gương nhà vệ sinh, rất nguy hiểm",
  "location": "Nhà vệ sinh H2"
}
```

| Field         | Type   | Required | Description                |
| ------------- | ------ | -------- | -------------------------- |
| `description` | string | Yes      | Mô tả sự cố (min 10 ký tự) |
| `location`    | string | No       | Vị trí xảy ra sự cố        |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "category": "DIEN",
    "priority": "CRITICAL",
    "suggestedStaffSkills": ["electrician", "electrical_safety"],
    "estimatedDuration": 120,
    "reasoning": "Sự cố điện giật có nguy cơ cao về an toàn, cần xử lý khẩn cấp",
    "confidence": 0.95
  },
  "message": "Phân loại báo cáo thành công"
}
```

### Category Values

- `DIEN`: Sự cố về điện
- `NUOC`: Sự cố về nước
- `MANG`: Sự cố mạng Internet/WiFi
- `NOI_THAT`: Nội thất (bàn ghế, cửa, tủ)
- `DIEU_HOA`: Điều hòa, quạt
- `VE_SINH`: Vệ sinh, rác thải
- `AN_NINH`: An ninh, khóa, camera
- `KHAC`: Các vấn đề khác

### Priority Values

- `CRITICAL`: Nguy hiểm tính mạng, cần xử lý ngay
- `HIGH`: Ảnh hưởng nhiều người, cần xử lý trong ngày
- `MEDIUM`: Ảnh hưởng ít, có thể đợi 1-2 ngày
- `LOW`: Vấn đề nhỏ, không ảnh hưởng sử dụng

---

## 7. Suggest Priority Only

Chỉ đề xuất độ ưu tiên (không phân loại category).

### Endpoint

```
POST /api/ai/classify/suggest-priority
```

### Request Body

```json
{
  "description": "Bóng đèn hỏng ở phòng 101"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "priority": "MEDIUM"
  },
  "message": "Đề xuất độ ưu tiên thành công"
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": ["Câu hỏi phải có ít nhất 3 ký tự"],
  "error": "Bad Request"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Token không được cung cấp",
  "error": "Unauthorized"
}
```

### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "message": "AI service temporarily unavailable",
  "error": "Internal Server Error"
}
```

---

## Frontend Integration Examples

### React/TypeScript Example

```typescript
// Chat API
async function sendChatMessage(query: string) {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      sourceTypes: ['report', 'faq'],
    }),
  });

  const data = await response.json();
  return data.data.answer;
}

// Search FAQ
async function searchFAQ(query: string) {
  const response = await fetch(
    `/api/ai/chat/faq?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await response.json();
  return data.data;
}

// Classify Report
async function classifyReport(description: string, location?: string) {
  const response = await fetch('/api/ai/classify/report', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description, location }),
  });

  const data = await response.json();
  return data.data; // { category, priority, ... }
}
```

### Axios Example

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Chat
const chatResponse = await api.post('/ai/chat', {
  query: 'Làm sao để báo cáo sự cố?',
  sourceTypes: ['faq', 'sop'],
});

// Similar Reports
const similarReports = await api.get('/ai/chat/similar-reports', {
  params: { q: 'điện giật' },
});

// Classify
const classification = await api.post('/ai/classify/report', {
  description: 'Nước rò rỉ ở tầng 2',
  location: 'Tòa A',
});
```

---

## Use Cases

### 1. Chatbot Widget

```typescript
// User types message
const userMessage = 'Tôi muốn báo cáo sự cố điện';

// Send to general chat
const response = await sendChatMessage(userMessage);

// Display answer
console.log(response.data.answer);
// "Để báo cáo sự cố điện, bạn có thể..."

// Show sources (references)
response.data.sources.forEach((source) => {
  console.log(`- ${source.metadata.title} (độ liên quan: ${source.score})`);
});
```

### 2. Smart Report Form

```typescript
// User types description
const description = 'Điện giật ở nhà vệ sinh, rất nguy hiểm';

// Auto-classify
const classification = await classifyReport(description, 'Nhà vệ sinh H2');

// Pre-fill form
form.category = classification.category; // "DIEN"
form.priority = classification.priority; // "CRITICAL"
form.suggestedStaff = classification.suggestedStaffSkills; // ["electrician"]
form.estimatedTime = classification.estimatedDuration; // 120 minutes

// Show reasoning to user
alert(`AI phân loại: ${classification.reasoning}`);
// "Sự cố điện giật có nguy cơ cao về an toàn..."
```

### 3. Search Similar Issues

```typescript
// Before creating new report, search similar ones
const similar = await searchSimilarReports(description);

// Show to user
if (similar.data.sources.length > 0) {
  console.log('Có báo cáo tương tự:');
  similar.data.sources.forEach((report) => {
    console.log(`- ${report.metadata.location}: ${report.content}`);
  });
}
```

### 4. FAQ Autocomplete

```typescript
// User typing in search box
const searchText = 'báo cáo';

// Debounce and search
const faqResults = await searchFAQ(searchText);

// Show suggestions
faqResults.data.sources.forEach((faq) => {
  showSuggestion(faq.metadata.title);
});
```

---

## Response Fields Explained

### `answer` (string)

- Câu trả lời được generate bởi AI
- Dựa trên context từ sources
- Ngôn ngữ: Tiếng Việt

### `sources` (array)

- Các tài liệu liên quan được tìm thấy
- Sắp xếp theo score (cao → thấp)
- `score`: 0-1 (1 = rất liên quan)

### `usage` (object)

- Thống kê token usage
- Dùng để monitor cost

---

## Best Practices

### 1. Debounce Search Requests

```typescript
import { debounce } from 'lodash';

const debouncedSearch = debounce(async (query) => {
  const result = await searchFAQ(query);
  setResults(result.data);
}, 300); // Wait 300ms after user stops typing
```

### 2. Handle Errors Gracefully

```typescript
try {
  const response = await sendChatMessage(query);
  setAnswer(response.data.answer);
} catch (error) {
  if (error.response?.status === 401) {
    // Redirect to login
    router.push('/login');
  } else {
    // Show fallback message
    setAnswer('Xin lỗi, AI tạm thời không khả dụng. Vui lòng thử lại sau.');
  }
}
```

### 3. Show Loading State

```typescript
const [isLoading, setIsLoading] = useState(false);

async function handleChat(query: string) {
  setIsLoading(true);
  try {
    const response = await sendChatMessage(query);
    setMessages([
      ...messages,
      { role: 'assistant', content: response.data.answer },
    ]);
  } finally {
    setIsLoading(false);
  }
}
```

### 4. Cache Responses

```typescript
const chatCache = new Map();

async function getCachedChat(query: string) {
  if (chatCache.has(query)) {
    return chatCache.get(query);
  }

  const response = await sendChatMessage(query);
  chatCache.set(query, response);
  return response;
}
```

---

## Notes

- **Rate Limiting**: Có giới hạn số request (tùy server config)
- **Max Query Length**: 500 ký tự
- **Response Time**: 1-5 giây tùy độ phức tạp
- **Sources Limit**: Mặc định trả về top 5 sources liên quan nhất
- **Language**: Hỗ trợ Tiếng Việt

---

## Quick Reference

| Feature          | Endpoint                            | Method | Use Case                     |
| ---------------- | ----------------------------------- | ------ | ---------------------------- |
| General Chat     | `/api/ai/chat`                      | POST   | Chatbot tổng quát            |
| FAQ              | `/api/ai/chat/faq`                  | GET    | Tìm câu hỏi thường gặp       |
| Facilities       | `/api/ai/chat/facilities`           | GET    | Tìm thông tin cơ sở vật chất |
| SOP              | `/api/ai/chat/sop`                  | GET    | Tìm quy trình xử lý          |
| Similar Reports  | `/api/ai/chat/similar-reports`      | GET    | Tìm báo cáo tương tự         |
| Classify Report  | `/api/ai/classify/report`           | POST   | Phân loại báo cáo mới        |
| Suggest Priority | `/api/ai/classify/suggest-priority` | POST   | Đề xuất độ ưu tiên           |

---

## Sample UI Flow

```
User: "Điện giật ở nhà vệ sinh"
  ↓
1. Call classify API → Get priority: CRITICAL
  ↓
2. Show warning: "⚠️ Sự cố mức độ CRITICAL - Cần xử lý ngay!"
  ↓
3. Call similar-reports API → Show 2 báo cáo tương tự
  ↓
4. User confirms → Submit report with auto-filled priority
  ↓
5. Show success + suggested actions from SOP
```
