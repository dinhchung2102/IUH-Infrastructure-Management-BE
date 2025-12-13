# AI Module

Module AI cung cấp các tính năng trí tuệ nhân tạo cho hệ thống quản lý cơ sở hạ tầng IUH.

## Chức năng chính

### 1. RAG (Retrieval-Augmented Generation)

- Chat với knowledge base để trả lời câu hỏi
- Tìm kiếm FAQ, SOP, thông tin cơ sở vật chất
- Tìm kiếm báo cáo tương tự
- Sử dụng vector search với Qdrant để tìm tài liệu liên quan

### 2. Phân loại báo cáo tự động

- Tự động phân loại category và priority cho báo cáo sự cố
- Đề xuất độ ưu tiên dựa trên mô tả
- Ước tính thời gian xử lý và kỹ năng nhân viên cần thiết

### 3. Vector Database (Qdrant)

- Lưu trữ và tìm kiếm embeddings của documents
- Indexing tự động khi có knowledge mới
- Hỗ trợ filter theo source type

## Cấu trúc

```
ai/
├── controllers/          # API endpoints
│   ├── ai-chat.controller.ts        # Chat API
│   ├── ai-classification.controller.ts  # Classification API
│   └── ai-sync.controller.ts        # Sync/indexing API
├── services/
│   ├── rag.service.ts               # RAG service
│   ├── classification.service.ts    # Classification service
│   ├── qdrant.service.ts            # Qdrant vector DB
│   ├── gemini.service.ts            # Google Gemini provider
│   ├── openai.service.ts             # OpenAI provider
│   └── sync.service.ts              # Document indexing
├── processors/
│   └── indexing.processor.ts        # Background job processor
└── providers/
    └── ai-service.provider.ts        # AI service factory
```

## API Endpoints

### Chat

- `POST /api/ai/chat` - Chat với knowledge base
- `GET /api/ai/chat/faq` - Tìm kiếm FAQ
- `GET /api/ai/chat/facilities` - Tìm kiếm thông tin cơ sở vật chất
- `GET /api/ai/chat/sop` - Tìm kiếm SOP
- `GET /api/ai/chat/similar-reports` - Tìm báo cáo tương tự

### Classification

- `POST /api/ai/classify/report` - Phân loại báo cáo
- `POST /api/ai/classify/suggest-priority` - Đề xuất độ ưu tiên

## AI Providers

Module hỗ trợ nhiều AI provider thông qua interface `AIService`:

- **Google Gemini** (mặc định)
- **OpenAI**

Provider được chọn thông qua biến môi trường `AI_PROVIDER`.

## Dependencies

- **Qdrant**: Vector database cho semantic search
- **BullMQ**: Background job processing cho indexing
- **MongoDB**: Lưu trữ indexed documents metadata

## Environment Variables

```env
AI_PROVIDER=gemini|openai
GEMINI_API_KEY=...
OPENAI_API_KEY=...
QDRANT_URL=...
QDRANT_API_KEY=...
```
