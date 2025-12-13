# Luồng Truy vấn RAG trong Vector Database và AI

Tài liệu này mô tả chi tiết cách hệ thống truy vấn RAG (Retrieval-Augmented Generation) hoạt động, từ khi user gửi câu hỏi đến khi nhận được câu trả lời từ AI.

## Tổng quan

RAG (Retrieval-Augmented Generation) là kỹ thuật kết hợp:

- **Retrieval**: Tìm kiếm thông tin liên quan từ vector database (Qdrant)
- **Augmented**: Bổ sung context cho AI
- **Generation**: AI tạo câu trả lời dựa trên context

## Luồng hoạt động tổng thể

```
User Query
    ↓
[1] Generate Query Embedding (AI Service)
    ↓
[2] Vector Search trong Qdrant
    ↓
[3] Retrieve Top K Documents
    ↓
[4] Assemble Context
    ↓
[5] Generate Answer với AI (có context)
    ↓
Response cho User
```

## Chi tiết từng bước

### Bước 1: User gửi câu hỏi

**API Endpoint**: `POST /api/ai/chat`

```typescript
// AIChatController.chat()
@Post()
async chat(@Body() dto: ChatDto) {
  const result = await this.ragService.query(dto.query, {
    sourceTypes: dto.sourceTypes, // Optional filter
  });

  return {
    success: true,
    data: {
      answer: result.answer,
      conversationId: dto.conversationId,
      sourcesCount: result.sources.length,
    },
    meta: {
      usage: result.usage,
    },
  };
}
```

**Request Example**:

```json
{
  "query": "Thầy Trọn có đẹp trai không?",
  "conversationId": "optional-id",
  "sourceTypes": ["faq", "general"] // Optional
}
```

---

### Bước 2: Generate Query Embedding

**File**: `src/features/ai/services/rag.service.ts`

```typescript
// RAGService.query()
async query(query: string, options?: {...}): Promise<RAGSearchResult> {
  // 1. Generate query embedding
  const queryVector = await this.aiService.generateEmbedding(query);
  // → Vector 768 dimensions (Gemini) hoặc 1536 (OpenAI)
}
```

**Chi tiết Generate Embedding**:

```typescript
// GeminiService.generateEmbedding()
async generateEmbedding(text: string): Promise<number[]> {
  const model = this.genAI.getGenerativeModel({
    model: 'text-embedding-004', // Gemini embedding model
  });

  const result = await model.embedContent(text);
  return result.embedding.values;
  // → [0.123, -0.456, 0.789, ..., 0.234] (768 numbers)
}
```

**Ví dụ**:

- Input: `"Thầy Trọn có đẹp trai không?"`
- Output: `[0.12, -0.45, 0.78, ..., 0.23]` (768 dimensions)

**Lưu ý**:

- Vector embedding biểu diễn semantic meaning của câu hỏi
- Các câu hỏi tương tự sẽ có vector gần nhau trong không gian vector
- Dimension phụ thuộc vào AI provider:
  - Gemini: 768 dimensions
  - OpenAI: 1536 dimensions

---

### Bước 3: Vector Search trong Qdrant

**File**: `src/features/ai/services/qdrant.service.ts`

```typescript
// QdrantService.search()
async search(
  queryVector: number[],
  options: {
    limit?: number;
    scoreThreshold?: number;
    filter?: Record<string, any>;
  },
): Promise<Array<{ id: string; score: number; payload: any }>> {
  // Validate vector dimension
  if (this.vectorSize !== null && queryVector.length !== this.vectorSize) {
    throw new Error('Vector dimension mismatch');
  }

  // Search trong Qdrant collection
  const searchResult = await this.client.search(this.collectionName, {
    vector: queryVector,
    limit: options.limit || 10,
    score_threshold: options.scoreThreshold,
    filter: options.filter, // Filter theo sourceType, etc.
  });

  return searchResult.map((point) => ({
    id: point.id.toString(),
    score: point.score, // Similarity score (0-1, càng cao càng giống)
    payload: point.payload, // Metadata: title, content, sourceType, etc.
  }));
}
```

**Filter Options**:

```typescript
// RAGService.query() - Build filter
const filter = options?.sourceTypes
  ? {
      must: [
        {
          key: 'sourceType',
          match: { any: options.sourceTypes }, // ['faq', 'general']
        },
      ],
    }
  : undefined;

// Search WITHOUT threshold first
const allResults = await this.qdrantService.search(queryVector, {
  limit: options?.topK || 8,
  scoreThreshold: undefined, // Không filter theo score trước
  filter,
});

// Filter by threshold manually
const searchResults = allResults.filter(
  (r) => r.score >= (options?.minScore || 0.3),
);
```

**Search Algorithm**:

- Qdrant sử dụng **Cosine Similarity** để tính độ tương đồng
- Score range: 0-1
  - Score cao (>0.7): Rất liên quan
  - Score trung bình (0.4-0.7): Liên quan
  - Score thấp (<0.4): Ít liên quan

**Qdrant Collection Structure**:

```
Collection: iuh_csvc_knowledge (hoặc iuh_csvc_knowledge_openai)
├── Vector: [0.12, -0.45, ..., 0.23] (768 hoặc 1536 dimensions)
├── Payload:
│   ├── sourceType: "faq" | "general" | "report" | ...
│   ├── sourceId: "mongodb-objectid"
│   ├── content: "Thầy Trọn được xem là..."
│   ├── title: "Thầy Trọn có đẹp trai không?"
│   └── metadata: {...}
└── ID: "uuid-v5-string"
```

---

### Bước 4: Assemble Context

**File**: `src/features/ai/services/rag.service.ts`

```typescript
// RAGService.assembleContext()
private assembleContext(results: any[]): string {
  if (results.length === 0) {
    return 'Không tìm thấy thông tin liên quan trong cơ sở dữ liệu.';
  }

  const contextParts = results.map((result, index) => {
    const metadata = result.payload;
    const content = metadata.content || '';
    const sourceType = metadata.sourceType || 'unknown';
    const title = metadata.title || `Document ${index + 1}`;

    return `[${index + 1}] ${title} (${sourceType}, score: ${result.score.toFixed(2)})
${content}
`;
  });

  return contextParts.join('\n---\n');
}
```

**Ví dụ Context được tạo**:

```
[1] Thầy Trọn có đẹp trai không? (faq, score: 0.85)
Thầy Giảng Thanh Trọn được xem là một trong những giảng viên "đẹp trai", phong thái điềm đạm, lịch sự và dễ gây thiện cảm. Dù đây là nhận xét mang tính cảm nhận cá nhân, nhưng nhìn chung sinh viên đều khen thầy đẹp trai và thân thiện. Vẻ ngoài của thầy được đánh giá là ưa nhìn, phong thái chuyên nghiệp và tạo thiện cảm với sinh viên.

---

[2] Thông tin về thầy Trọn – Giảng viên hướng dẫn (general, score: 0.72)
Thầy Giảng Thanh Trọn (hay còn gọi là thầy Trọn) là giảng viên tại Trường Đại học Công nghiệp TP.HCM (IUH), phụ trách hướng dẫn các đề tài, khóa luận tốt nghiệp của sinh viên. Thầy được biết đến là người nhiệt tình, hỗ trợ sinh viên tận tâm. Sinh viên thường nhận xét thầy thân thiện, vui vẻ và rất 'đẹp trai'.
```

---

### Bước 5: Generate Answer với AI

**File**: `src/features/ai/services/gemini.service.ts`

```typescript
// GeminiService.chatWithContext()
async chatWithContext(
  query: string,
  context: string,
  systemPrompt: string,
): Promise<{ answer: string; usage: any }> {
  const prompt = `${systemPrompt}

CONTEXT:
${context}

QUESTION:
${query}

ANSWER:`;

  const result = await this.chatCompletion(
    [{ role: 'user', content: prompt }],
    { temperature: 0.3, maxTokens: 1024 },
  );

  return {
    answer: result.content,
    usage: result.usage,
  };
}
```

**System Prompt**:

```typescript
// RAGService.getSystemPrompt()
private getSystemPrompt(): string {
  return `
Bạn là trợ lý AI thông minh của Trường Đại học Công nghiệp TP.HCM (IUH),
chuyên hỗ trợ về quản lý cơ sở vật chất và giải đáp thắc mắc.

NHIỆM VỤ:
- Trả lời câu hỏi dựa trên thông tin trong CONTEXT được cung cấp
- Trả lời NGẮN GỌN, SÚC TÍCH, dễ hiểu
- Nếu không tìm thấy thông tin đủ rõ ràng, hãy nói rõ và đề xuất liên hệ bộ phận hỗ trợ
- Giữ giọng điệu thân thiện, chuyên nghiệp
- Trả lời bằng tiếng Việt
- KHÔNG trích dẫn nguồn dạng "Theo tài liệu [1]..." - trả lời trực tiếp

CHÚ Ý QUAN TRỌNG:
- KHÔNG bịa đặt thông tin không có trong CONTEXT
- Nếu CONTEXT không đủ thông tin để trả lời, hãy thừa nhận và đưa ra gợi ý
- Ưu tiên độ chính xác hơn là trả lời đầy đủ
- Trả lời ngắn gọn, KHÔNG dài dòng
  `.trim();
}
```

**Full Prompt gửi đến AI**:

```
Bạn là trợ lý AI thông minh của Trường Đại học Công nghiệp TP.HCM (IUH),
chuyên hỗ trợ về quản lý cơ sở vật chất và giải đáp thắc mắc.

NHIỆM VỤ:
- Trả lời câu hỏi dựa trên thông tin trong CONTEXT được cung cấp
- Trả lời NGẮN GỌN, SÚC TÍCH, dễ hiểu
...

CONTEXT:
[1] Thầy Trọn có đẹp trai không? (faq, score: 0.85)
Thầy Giảng Thanh Trọn được xem là một trong những giảng viên "đẹp trai"...

---

[2] Thông tin về thầy Trọn – Giảng viên hướng dẫn (general, score: 0.72)
Thầy Giảng Thanh Trọn (hay còn gọi là thầy Trọn) là giảng viên...

QUESTION:
Thầy Trọn có đẹp trai không?

ANSWER:
```

**AI Model Config**:

- **Model**: `gemini-2.0-flash` (hoặc từ env `GEMINI_CHAT_MODEL`)
- **Temperature**: `0.3` (thấp để đảm bảo consistency)
- **Max Tokens**: `1024` (đủ cho câu trả lời ngắn gọn)

---

### Bước 6: Return Response

**Response Structure**:

```typescript
{
  success: true,
  data: {
    answer: "Thầy Giảng Thanh Trọn được đánh giá là một giảng viên đẹp trai, có phong thái điềm đạm và dễ gây thiện cảm với sinh viên.",
    conversationId: "optional-id",
    sourcesCount: 2,
  },
  meta: {
    usage: {
      promptTokens: 450,
      completionTokens: 65,
    },
    timestamp: "2025-12-13T10:30:00.000Z",
  },
}
```

---

## Specialized Search Methods

### 1. FAQ Search

```typescript
// RAGService.chatFAQ()
async chatFAQ(query: string): Promise<RAGSearchResult> {
  return this.query(query, {
    sourceTypes: ['faq'],
    topK: 5,
    minScore: 0.3,
  });
}

// API: GET /api/ai/chat/faq?q=thầy trọn có đẹp trai không
```

### 2. Facilities Search

```typescript
// RAGService.searchFacilities()
async searchFacilities(query: string): Promise<RAGSearchResult> {
  return this.query(query, {
    sourceTypes: ['facilities', 'facility', 'asset'],
    topK: 10,
    minScore: 0.3,
  });
}
```

### 3. SOP/Policy Search

```typescript
// RAGService.searchSOPs()
async searchSOPs(query: string): Promise<RAGSearchResult> {
  return this.query(query, {
    sourceTypes: ['sop', 'policy'],
    topK: 8,
    minScore: 0.3,
  });
}
```

### 4. Similar Reports Search

```typescript
// RAGService.searchSimilarReports()
async searchSimilarReports(query: string): Promise<RAGSearchResult> {
  return this.query(query, {
    sourceTypes: ['report'],
    topK: 10,
    minScore: 0.3,
  });
}
```

---

## Ví dụ luồng hoàn chỉnh

### Scenario: User hỏi "Thầy Trọn có đẹp trai không?"

**Bước 1**: User gửi request

```http
POST /api/ai/chat
Content-Type: application/json

{
  "query": "Thầy Trọn có đẹp trai không?"
}
```

**Bước 2**: Generate Embedding

```typescript
queryVector = await aiService.generateEmbedding('Thầy Trọn có đẹp trai không?');
// → [0.12, -0.45, 0.78, ..., 0.23] (768 dimensions)
```

**Bước 3**: Search Qdrant

```typescript
results = await qdrantService.search(queryVector, {
  limit: 8,
  scoreThreshold: undefined,
  filter: undefined, // Không filter, tìm trong tất cả
});

// Results:
[
  {
    id: "uuid-1",
    score: 0.85,
    payload: {
      sourceType: "faq",
      title: "Thầy Trọn có đẹp trai không?",
      content: "Thầy Giảng Thanh Trọn được xem là...",
      ...
    }
  },
  {
    id: "uuid-2",
    score: 0.72,
    payload: {
      sourceType: "general",
      title: "Thông tin về thầy Trọn",
      content: "Thầy Giảng Thanh Trọn là giảng viên...",
      ...
    }
  },
  // ... more results
]

// Filter by threshold (>= 0.3)
searchResults = results.filter(r => r.score >= 0.3);
// → 2 results
```

**Bước 4**: Assemble Context

```
[1] Thầy Trọn có đẹp trai không? (faq, score: 0.85)
Thầy Giảng Thanh Trọn được xem là một trong những giảng viên "đẹp trai"...

---

[2] Thông tin về thầy Trọn – Giảng viên hướng dẫn (general, score: 0.72)
Thầy Giảng Thanh Trọn (hay còn gọi là thầy Trọn) là giảng viên...
```

**Bước 5**: Generate Answer

```
Prompt gửi đến Gemini:
- System Prompt: "Bạn là trợ lý AI..."
- Context: "[1] Thầy Trọn có đẹp trai không? ..."
- Question: "Thầy Trọn có đẹp trai không?"

AI Response:
"Thầy Giảng Thanh Trọn được đánh giá là một giảng viên đẹp trai,
có phong thái điềm đạm, lịch sự và dễ gây thiện cảm với sinh viên."
```

**Bước 6**: Return Response

```json
{
  "success": true,
  "data": {
    "answer": "Thầy Giảng Thanh Trọn được đánh giá là một giảng viên đẹp trai, có phong thái điềm đạm, lịch sự và dễ gây thiện cảm với sinh viên.",
    "sourcesCount": 2
  },
  "meta": {
    "usage": {
      "promptTokens": 450,
      "completionTokens": 65
    }
  }
}
```

---

## Điểm quan trọng

### 1. Vector Embedding

- **Semantic Search**: Vector embedding cho phép tìm kiếm theo ý nghĩa, không chỉ từ khóa
- **Similarity**: Cosine similarity đo độ tương đồng giữa vectors
- **Dimension**: Phải match giữa query vector và collection vectors

### 2. Score Threshold

- **minScore: 0.3**: Filter out results có độ tương đồng thấp
- **Dynamic Threshold**: Có thể điều chỉnh tùy use case
- **No Results**: Nếu tất cả scores < threshold → Return "Không tìm thấy"

### 3. Context Assembly

- **Top K Results**: Chỉ lấy top K results để giữ context ngắn gọn
- **Score trong Context**: Giúp AI biết độ tin cậy của từng source
- **Format**: Structured format giúp AI parse dễ hơn

### 4. AI Generation

- **Temperature: 0.3**: Thấp để đảm bảo consistency
- **System Prompt**: Hướng dẫn AI cách trả lời
- **Context-based**: AI chỉ dựa vào context, không hallucinate

### 5. Error Handling

```typescript
// Nếu không tìm thấy results
if (searchResults.length === 0) {
  context = 'Không tìm thấy thông tin liên quan trong cơ sở dữ liệu.';
  // AI sẽ trả lời: "Thông tin không có trong dữ liệu, vui lòng liên hệ bộ phận hỗ trợ"
}
```

---

## Tối ưu hóa

### 1. Caching Embeddings

- Có thể cache query embeddings cho các câu hỏi phổ biến
- Giảm API calls đến AI service

### 2. Batch Processing

- Batch nhiều queries cùng lúc
- Giảm network latency

### 3. Filter Optimization

- Sử dụng filter để giảm search space
- Tăng tốc độ search

### 4. Result Ranking

- Có thể re-rank results dựa trên nhiều factors
- Combine vector similarity với keyword matching

---

## Troubleshooting

### 1. Không tìm thấy kết quả

**Nguyên nhân**:

- Documents chưa được index
- Score threshold quá cao
- Query không match với content

**Giải pháp**:

- Kiểm tra documents đã được index vào Qdrant
- Giảm `minScore` xuống 0.2
- Thử query với từ khóa khác

### 2. Câu trả lời không chính xác

**Nguyên nhân**:

- Context không đủ thông tin
- AI hallucinate

**Giải pháp**:

- Tăng `topK` để lấy nhiều results hơn
- Kiểm tra documents trong Qdrant có đúng không
- Improve system prompt

### 3. Vector Dimension Mismatch

**Nguyên nhân**:

- Collection được tạo với AI provider khác

**Giải pháp**:

- Xóa collection cũ trong Qdrant
- Restart app để tạo collection mới với dimension đúng

---

## Tài liệu tham khảo

- [RAG Service](./services/rag.service.ts)
- [Qdrant Service](./services/qdrant.service.ts)
- [Gemini Service](./services/gemini.service.ts)
- [Chat Controller](./controllers/ai-chat.controller.ts)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Gemini API](https://ai.google.dev/docs)
