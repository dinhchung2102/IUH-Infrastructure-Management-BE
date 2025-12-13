# Reports Indexing vào Vector Database

## Tổng quan

**CÓ**, tất cả reports trong MongoDB được tự động index vào Qdrant vector database để chatbot có thể truy vấn.

## Luồng hoạt động

### 1. Khi Report được tạo

```
User tạo report
    ↓
ReportService.createReport()
    ↓
Lưu vào MongoDB
    ↓
SyncService.onReportCreated()
    ↓
Format report text (bao gồm priority, description, location)
    ↓
Đưa vào BullMQ queue 'ai-indexing'
    ↓
IndexingProcessor xử lý:
  - Generate embedding từ report text
  - Upsert vào Qdrant với sourceType = 'report'
    ↓
Chatbot có thể tìm thấy report khi hỏi
```

### 2. Thông tin được index

**Text được format**:
- Loại báo cáo (type)
- Mô tả (description)
- **Mức độ ưu tiên (priority)** - CRITICAL, HIGH, MEDIUM, LOW
- Tài sản (asset name, code)
- Khu vực (zone/area name)
- Người báo cáo
- Trạng thái (status)

**Metadata trong Qdrant**:
- `sourceType`: "report"
- `title`: "Report {type}"
- `category`: report type
- `location`: zone/area name
- `status`: report status
- `priority`: report priority (CRITICAL, HIGH, MEDIUM, LOW)
- `createdAt`: timestamp

### 3. Ví dụ: Report khẩn cấp

**Report được tạo**:
```json
{
  "type": "DIEN",
  "description": "Mất điện toàn bộ tòa nhà A, có mùi cháy",
  "priority": "CRITICAL",
  "asset": { "name": "Tòa nhà A", "zone": { "name": "Tầng 1" } }
}
```

**Text được index**:
```
Loại báo cáo: DIEN
Mô tả: Mất điện toàn bộ tòa nhà A, có mùi cháy
Mức độ ưu tiên: CRITICAL (khẩn cấp)
Sự kiện khẩn cấp cần xử lý ngay
Tài sản: Tòa nhà A (ABC123)
Khu vực: Tầng 1
Trạng thái: PENDING
```

**Khi hỏi chatbot**:
- "Có sự kiện khẩn cấp nào không?" → Tìm thấy report CRITICAL
- "Có báo cáo nào về mất điện không?" → Tìm thấy report này
- "Sự cố ở tòa nhà A?" → Tìm thấy report này

## Truy vấn Reports qua Chatbot

### Endpoint chuyên biệt

**GET** `/api/ai/chat/similar-reports?q=<query>`

Tìm kiếm reports tương tự với query.

**Ví dụ**:
- `q=có sự kiện khẩn cấp nào không`
- `q=báo cáo về mất điện`
- `q=sự cố ở tòa nhà A`

### Endpoint chung

**POST** `/api/ai/chat`

Với `sourceTypes: ["report"]` để chỉ tìm trong reports.

## Lưu ý

### 1. Delay trong indexing

- Indexing chạy **async** qua BullMQ queue
- Có thể mất vài giây để report được index
- Nếu hỏi ngay sau khi tạo report, có thể chưa tìm thấy

### 2. Priority được nhấn mạnh

- Reports CRITICAL có thêm text: "Sự kiện khẩn cấp cần xử lý ngay"
- Reports HIGH có thêm text: "Sự kiện quan trọng cần xử lý sớm"
- Giúp chatbot dễ tìm thấy khi hỏi về "khẩn cấp" hoặc "quan trọng"

### 3. Auto-sync

- **Created**: Tự động index khi tạo
- **Updated**: Cập nhật metadata (status) khi report được update
- **Deleted**: Xóa khỏi Qdrant khi report bị xóa

## Kiểm tra Reports đã được index

### 1. Kiểm tra trong MongoDB

Collection: `indexed_documents`
- Filter: `{ sourceType: "report" }`
- Xem `lastSyncedAt` để biết thời gian index

### 2. Kiểm tra trong Qdrant

- Collection: `iuh_csvc_knowledge` (hoặc `iuh_csvc_knowledge_openai`)
- Filter: `{ sourceType: "report" }`
- Xem payload để kiểm tra metadata

## Troubleshooting

### Report không tìm thấy trong chatbot

**Nguyên nhân**:
1. Report chưa được index (delay)
2. Indexing job failed
3. Query không match với report content

**Giải pháp**:
1. Đợi vài giây rồi thử lại
2. Kiểm tra logs: `IndexingProcessor` và `SyncService`
3. Kiểm tra `indexed_documents` collection
4. Thử query với từ khóa khác (ví dụ: "mất điện" thay vì "điện")

### Re-index reports

Nếu cần re-index tất cả reports:
- Gọi API sync: `POST /api/ai/sync/reports` (nếu có)
- Hoặc chạy `syncAllReports()` trong code

