# Chatbot AI với Qdrant Database - Luồng hoạt động

Tài liệu này mô tả chi tiết cách chatbot AI hoạt động với Qdrant vector database trong project này.

## Tổng quan

Hệ thống sử dụng **RAG (Retrieval-Augmented Generation)** pattern:
- **Qdrant**: Lưu trữ vector embeddings của documents (Knowledge, Reports)
- **AI Service** (Gemini/OpenAI): Generate embeddings và tạo câu trả lời
- **MongoDB**: Lưu trữ metadata và tracking của indexed documents

## Luồng hoạt động

### 1. Giai đoạn Indexing (Đưa dữ liệu vào Qdrant)

#### 1.1. Khi Knowledge/Report được tạo/cập nhật

```
Knowledge/Report Created/Updated
    ↓
SyncService.onKnowledgeCreated() / onReportCreated()
    ↓
Tạo job đưa vào BullMQ queue 'ai-indexing'
    ↓
IndexingProcessor.handleIndexDocument()
```

#### 1.2. Chi tiết quá trình Indexing

```typescript
// SyncService format document
const text = formatKnowledgeText(knowledge); // "Tiêu đề: ... Nội dung: ..."
const vectorId = mongoIdToUUID(mongoId); // Convert MongoDB ID → UUID v5

// Đưa vào queue
indexingQueue.add('index-document', {
  vectorId,
  sourceType: 'faq', // hoặc 'report', 'sop', etc.
  sourceId: mongoId,
  text,
  metadata: { title, category, type, tags, ... }
});
```

#### 1.3. Background Worker xử lý

**IndexingProcessor** xử lý job:

```typescript
async handleIndexDocument(job) {
  // 1. Generate embedding từ AI service
  const embedding = await aiService.generateEmbedding(text);
  // → Vector 768 dimensions (Gemini) hoặc 1536 (OpenAI)
  
  // 2. Upsert vào Qdrant
  await qdrantService.upsertDocument(vectorId, embedding, {
    sourceType: 'faq',
    sourceId: mongoId,
    content: text.substring(0, 500), // Preview
    ...metadata
  });
  
  // 3. Lưu tracking vào MongoDB
  await indexedDocModel.findOneAndUpdate({ vectorId }, {
    vectorId,
    sourceType,
    sourceId,
    content: text, // Full text
    metadata,
    lastSyncedAt: new Date(),
    isActive: true
  });
}
```

**Kết quả:**
- Document được lưu trong Qdrant với vector embedding
- Metadata và full content được lưu trong MongoDB
- Có thể tìm kiếm bằng semantic search

---

### 2. Giai đoạn Querying (Người dùng hỏi - AI trả lời)

#### 2.1. Luồng chính khi user hỏi

```
User gửi câu hỏi: "Cô Hạnh có nghiêm khắc không?"
    ↓
AIChatController.chat()
    ↓
RAGService.query()
    ↓
[1] Generate query embedding
[2] Search Qdrant (vector similarity search)
[3] Lấy top K documents liên quan
[4] Assemble context từ results
[5] Generate answer với AI (có context)
    ↓
Trả về câu trả lời cho user
```

#### 2.2. Chi tiết từng bước

**Bước 1: Generate Query Embedding**

```typescript
// RAGService.query()
const queryVector = await aiService.generateEmbedding("Cô Hạnh có nghiêm khắc không?");
// → Vector 768 dimensions (giống với documents trong Qdrant)
```

**Bước 2: Vector Search trong Qdrant**

```typescript
// QdrantService.search()
const searchResults = await qdrantService.search(queryVector, {
  limit: 8, // Top 8 results
  scoreThreshold: 0.3, // Minimum similarity score
  filter: {
    must: [{
      key: 'sourceType',
      match: { any: ['faq'] } // Chỉ tìm trong FAQ
    }]
  }
});

// Kết quả: Array of { id, score, payload }
// score: 0-1 (càng cao càng giống)
```

**Bước 3: Assemble Context**

```typescript
// RAGService.assembleContext()
const context = results.map((result, index) => {
  return `[${index + 1}] ${result.payload.title} (${result.payload.sourceType}, score: ${result.score.toFixed(2)})
${result.payload.content}
`;
}).join('\n---\n');

// Context mẫu:
// [1] Cô Nguyễn Thị Hạnh có nghiêm khắc không? (faq, score: 0.85)
// Sinh viên thường nhận xét cô Hạnh là người nghiêm túc...
// ---
// [2] Thông tin về Cô Hạnh (general, score: 0.72)
// ...
```

**Bước 4: Generate Answer với Context**

```typescript
// AI Service nhận:
// - Query: "Cô Hạnh có nghiêm khắc không?"
// - Context: "[1] ... --- [2] ..."
// - System Prompt: "Bạn là trợ lý AI của IUH..."

const { answer } = await aiService.chatWithContext(
  query,
  context,
  systemPrompt
);

// AI sẽ trả lời dựa trên context được cung cấp
```

---

## Cấu trúc dữ liệu

### Qdrant Collection

**Collection Name**: `iuh_csvc_knowledge` (hoặc `iuh_csvc_knowledge_openai` nếu dùng OpenAI)

**Vector Dimension**: 
- Gemini: 768 dimensions
- OpenAI: 1536 dimensions

**Document Structure trong Qdrant**:
```json
{
  "id": "uuid-v5-string",
  "vector": [0.123, -0.456, ..., 0.789], // 768 hoặc 1536 số
  "payload": {
    "sourceType": "faq", // hoặc "report", "sop", "general"
    "sourceId": "mongodb-objectid",
    "content": "Preview text...",
    "title": "Tiêu đề",
    "category": "mentor-info",
    "type": "FAQ",
    "tags": ["tag1", "tag2"],
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### MongoDB IndexedDocument Schema

```typescript
{
  vectorId: string,        // UUID v5 (primary key)
  sourceType: string,      // 'faq', 'report', 'sop', etc.
  sourceId: string,        // MongoDB ObjectID gốc
  content: string,         // Full text content
  metadata: object,        // Full metadata
  embeddingDimension: number,
  lastSyncedAt: Date,
  isActive: boolean
}
```

---

## Các API Endpoints

### Chat API

**POST** `/api/ai/chat`
```json
{
  "query": "Cô Hạnh có nghiêm khắc không?",
  "conversationId": "optional",
  "sourceTypes": ["faq"] // optional filter
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "Cô Hạnh được đánh giá là nghiêm túc và kỹ tính...",
    "conversationId": "...",
    "sourcesCount": 3
  },
  "meta": {
    "usage": { "promptTokens": 500, "completionTokens": 150 }
  }
}
```

### Specialized Search APIs

- **GET** `/api/ai/chat/faq?q=...` - Tìm trong FAQ only
- **GET** `/api/ai/chat/facilities?q=...` - Tìm thông tin cơ sở vật chất
- **GET** `/api/ai/chat/sop?q=...` - Tìm SOP/Policy
- **GET** `/api/ai/chat/similar-reports?q=...` - Tìm báo cáo tương tự

---

## Điểm quan trọng

### 1. Vector ID Conversion

- **MongoDB ID** (ObjectID) được convert sang **UUID v5** để làm vector ID trong Qdrant
- UUID v5 là deterministic (cùng input → cùng output)
- Giúp track document giữa MongoDB và Qdrant

```typescript
const vectorId = uuidv5(mongoId, UUID_NAMESPACE);
```

### 2. Filter theo Source Type

Qdrant hỗ trợ filter khi search:
- Chỉ tìm trong FAQ: `sourceTypes: ['faq']`
- Chỉ tìm Reports: `sourceTypes: ['report']`
- Tìm nhiều types: `sourceTypes: ['faq', 'sop']`

### 3. Score Threshold

- `minScore: 0.3` - Tối thiểu similarity score để coi là relevant
- Score cao (>0.7): Rất liên quan
- Score thấp (<0.4): Ít liên quan, có thể bỏ qua

### 4. Background Processing

- Indexing được xử lý async qua BullMQ queue
- Giúp không block main thread khi có nhiều documents
- Có retry mechanism nếu indexing fail

---

## Configuration

### Environment Variables

```env
# AI Provider
AI_PROVIDER=gemini  # hoặc 'openai'

# Gemini
GEMINI_KEY=your-api-key
GEMINI_CHAT_MODEL=gemini-2.0-flash

# OpenAI (nếu dùng)
OPENAI_API_KEY=your-api-key

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=optional-api-key

# Redis (cho BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Vector Dimension

- **Gemini**: 768 dimensions (default)
- **OpenAI**: 1536 dimensions

Collection name tự động thay đổi dựa trên dimension để tránh conflict.

---

## Troubleshooting

### Vector Dimension Mismatch

**Lỗi**: "Vector dimension mismatch"

**Nguyên nhân**: Collection được tạo với AI provider khác (ví dụ: Gemini → OpenAI)

**Giải pháp**: 
- Xóa collection cũ trong Qdrant
- Restart app để tạo collection mới với dimension đúng

### Không tìm thấy kết quả

**Nguyên nhân**: 
- Documents chưa được index
- Score threshold quá cao
- Query không match với content

**Giải pháp**:
- Kiểm tra documents đã được index chưa (MongoDB IndexedDocument)
- Giảm `minScore` xuống 0.2
- Thử query với từ khóa khác

---

## Ví dụ luồng hoàn chỉnh

### Scenario: User hỏi về Cô Hạnh

1. **User**: `POST /api/ai/chat` với query: "Cô Hạnh có nghiêm khắc không?"

2. **RAGService**: 
   - Generate embedding: `queryVector = [0.1, -0.2, ..., 0.5]` (768 dims)

3. **QdrantService**:
   - Search với `queryVector`, filter `sourceType = 'faq'`
   - Trả về 3 documents với scores: 0.85, 0.72, 0.58

4. **RAGService**:
   - Assemble context từ 3 documents
   - Generate answer với AI: "Cô Hạnh được đánh giá là nghiêm túc và kỹ tính..."

5. **Response**: Trả về answer + sourcesCount = 3

---

## Tài liệu tham khảo

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [RAG Pattern](https://www.pinecone.io/learn/retrieval-augmented-generation/)
- [Google Gemini API](https://ai.google.dev/docs)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)


