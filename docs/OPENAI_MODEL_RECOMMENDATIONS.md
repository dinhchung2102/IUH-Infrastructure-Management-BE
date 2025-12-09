# OpenAI Model Recommendations

## Tác vụ hiện tại trong hệ thống:

1. **Classification Service**: Phân loại report, gợi ý priority và processing days
   - Temperature: 0.2
   - MaxTokens: 500
   - Yêu cầu: Trả về JSON chính xác

2. **RAG Chat Service**: Chat với context từ knowledge base
   - Temperature: 0.3
   - MaxTokens: 1024
   - Yêu cầu: Hiểu context và trả lời chính xác

3. **Metadata Extraction**: Trích xuất metadata từ documents
   - Temperature: 0.2
   - MaxTokens: 300
   - Yêu cầu: Phân tích và extract thông tin

## Đề xuất Model:

### ✅ **KHUYẾN NGHỊ: `gpt-4o-mini`** (Đang dùng)

- **Giá**: $0.15/$0.075/$0.60 (Input/Cached/Output per 1M tokens)
- **Lý do**:
  - ✅ Rất rẻ, phù hợp cho production
  - ✅ Đủ mạnh cho tất cả tác vụ hiện tại
  - ✅ Tốc độ nhanh
  - ✅ Độ chính xác tốt cho classification và RAG
  - ✅ Đã được test và hoạt động ổn định

### 🔄 **THAY THẾ: `gpt-5-mini`** (Nếu muốn model mới hơn)

- **Giá**: $0.25/$0.025/$2.00
- **Lý do**:
  - ✅ Model mới nhất, có thể tốt hơn
  - ✅ Giá input rẻ hơn ($0.25 vs $0.15)
  - ⚠️ Output đắt hơn ($2.00 vs $0.60)
  - ⚠️ Có thể chưa stable bằng gpt-4o-mini
- **Khi nào dùng**: Khi cần model mới nhất và output không quá nhiều

### 💰 **TIẾT KIỆM TỐI ĐA: `gpt-4.1-nano`** ($0.10/$0.025/$0.40)

- **Giá**: Rẻ nhất trong các model GPT-4 series
- **Ưu điểm**:
  - ✅ Rẻ hơn gpt-4o-mini ~33% (input) và ~33% (output)
  - ✅ Đủ cho các tác vụ đơn giản
- **Nhược điểm**:
  - ⚠️ Có thể yếu hơn trong việc parse JSON phức tạp
  - ⚠️ Có thể kém chính xác hơn trong classification
  - ⚠️ Có thể không handle tốt context dài trong RAG
- **Khi nào dùng**:
  - Khi cần tiết kiệm chi phí tối đa
  - Khi tác vụ đơn giản, không cần độ chính xác cao
  - Khi có thể chấp nhận một số lỗi nhỏ
- **⚠️ LƯU Ý**: Nên test kỹ trước khi dùng production

### 🚫 **KHÔNG KHUYẾN NGHỊ:**

- **gpt-4o** ($2.50/$1.25/$10.00): Đắt gấp 16 lần, không cần thiết
- **o1/o3 series**: Reasoning models, đắt và không phù hợp cho tác vụ hiện tại
- **gpt-5/gpt-5.1**: Quá đắt, không cần thiết

## Cấu hình:

Trong file `.env`:

```env
AI=openai
OPENAI_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini      # Khuyến nghị (cân bằng tốt nhất)
# hoặc
OPENAI_MODEL=gpt-4.1-nano     # Nếu muốn tiết kiệm tối đa (cần test kỹ)
# hoặc
OPENAI_MODEL=gpt-5-mini       # Nếu muốn thử model mới
```

## So sánh chi phí ước tính:

Giả sử 1000 requests/ngày, mỗi request trung bình:

- Input: 500 tokens
- Output: 200 tokens

### Với `gpt-4o-mini`:

- Input: 1000 × 500 × $0.15 / 1M = $0.075/ngày
- Output: 1000 × 200 × $0.60 / 1M = $0.12/ngày
- **Tổng: ~$0.20/ngày (~$6/tháng)**

### Với `gpt-5-mini`:

- Input: 1000 × 500 × $0.25 / 1M = $0.125/ngày
- Output: 1000 × 200 × $2.00 / 1M = $0.40/ngày
- **Tổng: ~$0.525/ngày (~$15.75/tháng)**

### Với `gpt-4.1-nano`:

- Input: 1000 × 500 × $0.10 / 1M = $0.05/ngày
- Output: 1000 × 200 × $0.40 / 1M = $0.08/ngày
- **Tổng: ~$0.13/ngày (~$3.90/tháng)** ⭐ Rẻ nhất

## Kết luận:

### **Khuyến nghị chính: `gpt-4o-mini`**

Đây là lựa chọn tốt nhất cho hệ thống hiện tại:

- ✅ Tiết kiệm chi phí
- ✅ Đủ mạnh cho tất cả tác vụ
- ✅ Đã được test và hoạt động ổn định
- ✅ Tốc độ nhanh

### **Nếu muốn tiết kiệm tối đa: `gpt-4.1-nano`**

- ⚠️ **CẢNH BÁO**: Model nhỏ hơn, có thể kém chính xác
- ✅ Rẻ hơn ~35% so với gpt-4o-mini ($3.90/tháng vs $6/tháng)
- ⚠️ Nên test kỹ trước khi dùng production
- ⚠️ Có thể cần retry logic nhiều hơn do JSON parsing errors
- ⚠️ Có thể không handle tốt các prompt phức tạp

### **Nếu muốn tiết kiệm tối đa: `gpt-4.1-nano`**

- ⚠️ **CẢNH BÁO**: Model nhỏ hơn, có thể kém chính xác
- ✅ Rẻ hơn ~35% so với gpt-4o-mini
- ⚠️ Nên test kỹ trước khi dùng production
- ⚠️ Có thể cần retry logic nhiều hơn do JSON parsing errors
