# Tính toán chi phí GPT-4o-mini

## Giá của GPT-4o-mini:
- **Input**: $0.15 / 1M tokens
- **Cached Input**: $0.075 / 1M tokens (nếu dùng cache)
- **Output**: $0.60 / 1M tokens

---

## Phân tích các tác vụ trong hệ thống:

### 1. **Classification Service** (Phân loại report)
- **Khi nào chạy**: Mỗi khi tạo report mới (nếu không có priority)
- **Input tokens**: ~800-1200 tokens
  - Prompt classification: ~600 tokens
  - RAG context (nếu có): ~200-400 tokens
  - Description report: ~100-200 tokens
- **Output tokens**: ~150-250 tokens (JSON response)
- **MaxTokens setting**: 500

### 2. **RAG Chat Service** (Chat với knowledge base)
- **Khi nào chạy**: Khi user chat với AI assistant
- **Input tokens**: ~1000-2000 tokens
  - System prompt: ~200 tokens
  - Context từ Qdrant: ~500-1500 tokens
  - User query: ~50-100 tokens
- **Output tokens**: ~200-400 tokens
- **MaxTokens setting**: 1024

### 3. **Metadata Extraction** (Trích xuất metadata từ documents)
- **Khi nào chạy**: Khi import knowledge từ Word/PDF
- **Input tokens**: ~400-600 tokens
  - Prompt extraction: ~300 tokens
  - Content preview (2000 chars): ~500 tokens
- **Output tokens**: ~100-150 tokens (JSON response)
- **MaxTokens setting**: 300

---

## Tính toán chi phí theo các kịch bản:

### 📊 **KỊCH BẢN 1: Quy mô nhỏ (Trường học nhỏ)**
Giả định:
- **Reports/ngày**: 20 reports
- **RAG Chat/ngày**: 50 queries
- **Knowledge imports/tháng**: 10 documents

#### Chi phí theo ngày:
**Classification (20 requests):**
- Input: 20 × 1000 tokens × $0.15 / 1M = **$0.003/ngày**
- Output: 20 × 200 tokens × $0.60 / 1M = **$0.0024/ngày**

**RAG Chat (50 requests):**
- Input: 50 × 1500 tokens × $0.15 / 1M = **$0.01125/ngày**
- Output: 50 × 300 tokens × $0.60 / 1M = **$0.009/ngày**

**Metadata Extraction (10/30 = 0.33/ngày):**
- Input: 0.33 × 500 tokens × $0.15 / 1M = **$0.000025/ngày**
- Output: 0.33 × 125 tokens × $0.60 / 1M = **$0.000025/ngày**

**TỔNG/NGÀY**: ~**$0.026/ngày**
**TỔNG/THÁNG**: ~**$0.78/tháng** (~18,700 VNĐ)

---

### 📊 **KỊCH BẢN 2: Quy mô trung bình (Trường đại học)**
Giả định:
- **Reports/ngày**: 100 reports
- **RAG Chat/ngày**: 200 queries
- **Knowledge imports/tháng**: 50 documents

#### Chi phí theo ngày:
**Classification (100 requests):**
- Input: 100 × 1000 tokens × $0.15 / 1M = **$0.015/ngày**
- Output: 100 × 200 tokens × $0.60 / 1M = **$0.012/ngày**

**RAG Chat (200 requests):**
- Input: 200 × 1500 tokens × $0.15 / 1M = **$0.045/ngày**
- Output: 200 × 300 tokens × $0.60 / 1M = **$0.036/ngày**

**Metadata Extraction (50/30 = 1.67/ngày):**
- Input: 1.67 × 500 tokens × $0.15 / 1M = **$0.000125/ngày**
- Output: 1.67 × 125 tokens × $0.60 / 1M = **$0.000125/ngày**

**TỔNG/NGÀY**: ~**$0.108/ngày**
**TỔNG/THÁNG**: ~**$3.24/tháng** (~77,700 VNĐ)

---

### 📊 **KỊCH BẢN 3: Quy mô lớn (Trường đại học lớn, nhiều campus)**
Giả định:
- **Reports/ngày**: 300 reports
- **RAG Chat/ngày**: 500 queries
- **Knowledge imports/tháng**: 100 documents

#### Chi phí theo ngày:
**Classification (300 requests):**
- Input: 300 × 1000 tokens × $0.15 / 1M = **$0.045/ngày**
- Output: 300 × 200 tokens × $0.60 / 1M = **$0.036/ngày**

**RAG Chat (500 requests):**
- Input: 500 × 1500 tokens × $0.15 / 1M = **$0.1125/ngày**
- Output: 500 × 300 tokens × $0.60 / 1M = **$0.09/ngày**

**Metadata Extraction (100/30 = 3.33/ngày):**
- Input: 3.33 × 500 tokens × $0.15 / 1M = **$0.00025/ngày**
- Output: 3.33 × 125 tokens × $0.60 / 1M = **$0.00025/ngày**

**TỔNG/NGÀY**: ~**$0.284/ngày**
**TỔNG/THÁNG**: ~**$8.52/tháng** (~204,500 VNĐ)

---

### 📊 **KỊCH BẢN 4: Quy mô rất lớn (Enterprise)**
Giả định:
- **Reports/ngày**: 1000 reports
- **RAG Chat/ngày**: 2000 queries
- **Knowledge imports/tháng**: 500 documents

#### Chi phí theo ngày:
**Classification (1000 requests):**
- Input: 1000 × 1000 tokens × $0.15 / 1M = **$0.15/ngày**
- Output: 1000 × 200 tokens × $0.60 / 1M = **$0.12/ngày**

**RAG Chat (2000 requests):**
- Input: 2000 × 1500 tokens × $0.15 / 1M = **$0.45/ngày**
- Output: 2000 × 300 tokens × $0.60 / 1M = **$0.36/ngày**

**Metadata Extraction (500/30 = 16.67/ngày):**
- Input: 16.67 × 500 tokens × $0.15 / 1M = **$0.00125/ngày**
- Output: 16.67 × 125 tokens × $0.60 / 1M = **$0.00125/ngày**

**TỔNG/NGÀY**: ~**$1.082/ngày**
**TỔNG/THÁNG**: ~**$32.46/tháng** (~779,000 VNĐ)

---

## 📈 Bảng tóm tắt:

| Kịch bản | Reports/ngày | RAG/ngày | Chi phí/ngày | Chi phí/tháng | VNĐ/tháng |
|----------|--------------|----------|--------------|---------------|-----------|
| **Nhỏ** | 20 | 50 | $0.026 | **$0.78** | ~18,700₫ |
| **Trung bình** | 100 | 200 | $0.108 | **$3.24** | ~77,700₫ |
| **Lớn** | 300 | 500 | $0.284 | **$8.52** | ~204,500₫ |
| **Rất lớn** | 1000 | 2000 | $1.082 | **$32.46** | ~779,000₫ |

---

## 💡 Các cách tối ưu chi phí:

### 1. **Sử dụng Cached Input** (Giảm 50% chi phí input)
- Nếu prompt tương tự được cache, chỉ tốn $0.075/1M tokens thay vì $0.15
- **Tiết kiệm**: ~30-40% tổng chi phí

### 2. **Giảm RAG Context**
- Chỉ lấy top 3-5 documents thay vì 10
- **Tiết kiệm**: ~20-30% chi phí RAG

### 3. **Cache Classification Results**
- Cache kết quả classification cho các report tương tự
- **Tiết kiệm**: ~10-20% chi phí classification

### 4. **Batch Processing**
- Xử lý metadata extraction theo batch
- **Tiết kiệm**: ~5-10% chi phí

---

## 🎯 Kết luận:

Với **gpt-4o-mini**, chi phí rất hợp lý:
- **Quy mô nhỏ**: ~$0.78/tháng (~18,700₫)
- **Quy mô trung bình**: ~$3.24/tháng (~77,700₫)
- **Quy mô lớn**: ~$8.52/tháng (~204,500₫)

**So sánh với gpt-4.1-nano** (tiết kiệm ~35%):
- Quy mô trung bình: ~$2.10/tháng vs $3.24/tháng
- **Tiết kiệm**: ~$1.14/tháng (~27,400₫)

**Khuyến nghị**: 
- Nếu budget hạn chế → Dùng `gpt-4.1-nano` (tiết kiệm ~35%)
- Nếu cần độ chính xác cao → Dùng `gpt-4o-mini` (đã test, ổn định)

