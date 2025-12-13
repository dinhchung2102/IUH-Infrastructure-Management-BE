# Phân loại mức độ ưu tiên và Dự báo thời gian hoàn thành

Tài liệu này mô tả chi tiết cách hệ thống AI tự động phân loại mức độ ưu tiên (priority) và dự báo thời gian hoàn thành (processing days) cho các báo cáo sự cố.

## Tổng quan

Hệ thống sử dụng **AI Classification Service** để:

- **Phân loại mức độ ưu tiên**: CRITICAL, HIGH, MEDIUM, LOW
- **Dự báo thời gian hoàn thành**: Số ngày xử lý từ lúc được phê duyệt
- **Phân loại category**: DIEN, NUOC, MANG, NOI_THAT, DIEU_HOA, VE_SINH, AN_NINH, KHAC
- **Đề xuất kỹ năng nhân viên**: Kỹ năng cần thiết để xử lý sự cố

## Luồng hoạt động

### 1. Giai đoạn: Tạo báo cáo mới

#### 1.1. Khi user tạo báo cáo

```
User POST /api/report
    ↓
ReportService.createReport()
    ↓
Kiểm tra: priority có được cung cấp?
    ↓
Nếu KHÔNG có → Gọi AI Classification
    ↓
ClassificationService.classifyReport()
```

#### 1.2. Chi tiết quá trình Classification

**Bước 1: Tìm kiếm quy định thời gian xử lý từ RAG**

```typescript
// ClassificationService.classifyReport()
if (this.ragService) {
  // Tìm kiếm quy định về thời gian xử lý
  let ragResult = await this.ragService.query(
    `quy định thời gian xử lý sự cố ${description}`,
    {
      sourceTypes: ['regulation'], // Tìm trong quy định
      topK: 3,
      minScore: 0.3,
    },
  );

  // Nếu không tìm thấy với filter, thử lại không có filter
  if (!ragResult.sources || ragResult.sources.length === 0) {
    ragResult = await this.ragService.query(
      `quy định thời gian xử lý sự cố ${description}`,
      { topK: 5, minScore: 0.3 },
    );
  }

  // Lọc các documents liên quan đến regulation
  const relevantSources = ragResult.sources.filter((s) => {
    const type = s.metadata?.type?.toLowerCase() || '';
    const content = s.content.toLowerCase();
    return (
      type === 'regulation' ||
      content.includes('thời gian xử lý') ||
      content.includes('processing') ||
      content.includes('ngày')
    );
  });

  // Tạo context từ quy định
  if (relevantSources.length > 0) {
    processingTimeContext = `\n\nQUY ĐỊNH THỜI GIAN XỬ LÝ TỪ CƠ SỞ DỮ LIỆU:\n${relevantSources.map((s, i) => `[${i + 1}] ${s.content}`).join('\n\n')}`;
  }
}
```

**Mục đích**:

- Tìm kiếm quy định cụ thể về thời gian xử lý từ knowledge base
- Cung cấp context cho AI để đưa ra dự báo chính xác hơn

**Bước 2: Build Classification Prompt**

```typescript
const prompt = this.buildClassificationPrompt(
  description, // "Mất điện tại phòng học A101"
  location, // "Phòng học A101" (optional)
  processingTimeContext, // Quy định từ RAG (optional)
);
```

**Prompt structure**:

- Mô tả sự cố
- Địa điểm (nếu có)
- Quy định thời gian xử lý (nếu tìm thấy từ RAG)
- Yêu cầu trả về JSON với format cụ thể
- Định nghĩa các categories và priorities
- Hướng dẫn cách tính processingDays

**Bước 3: Gọi AI Service**

```typescript
const response = await this.aiService.chatCompletion(
  [{ role: 'user', content: prompt }],
  {
    temperature: 0.2, // Thấp để đảm bảo consistency
    maxTokens: 500, // Đủ cho JSON response
  },
);
```

**Bước 4: Parse JSON Response**

````typescript
// Loại bỏ markdown code blocks nếu có
const jsonText = response.content.replace(/```json\n?|\n?```/g, '').trim();

const classification = JSON.parse(jsonText) as {
  category?: string; // "DIEN", "NUOC", etc.
  priority?: string; // "CRITICAL", "HIGH", etc.
  suggestedStaffSkills?: string[]; // ["electrician", "electrical_safety"]
  estimatedDuration?: number; // 60 (phút)
  processingDays?: number; // 2 (ngày)
  reasoning?: string; // "Sự cố mất điện ảnh hưởng..."
  confidence?: number; // 0.85
};
````

**Bước 5: Fallback và Validation**

```typescript
// Nếu AI không trả về đầy đủ, sử dụng defaults
const priority = classification.priority || 'MEDIUM';
const processingDays =
  classification.processingDays ||
  this.calculateDefaultProcessingDays(priority);

// calculateDefaultProcessingDays():
// - CRITICAL: 1 ngày
// - HIGH: 2 ngày
// - MEDIUM: 3 ngày
// - LOW: 5 ngày
```

#### 1.3. Sử dụng kết quả trong Report Service

```typescript
// ReportService.createReport()
if (this.classificationService) {
  const classification = await this.classificationService.classifyReport(
    createReportDto.description,
    asset.name as string, // Location context
  );

  // Set priority nếu user chưa cung cấp
  if (!priority) {
    priority = classification.priority;
  }

  // Luôn lấy suggestedProcessingDays từ AI
  suggestedProcessingDays = classification.processingDays;
}

// Lưu vào report
const newReport = new this.reportModel({
  // ...
  priority: priority,
  suggestedProcessingDays: suggestedProcessingDays,
});
```

**Validation đặc biệt**:

- Nếu user là **GUEST** hoặc **first-time reporter** và priority là **CRITICAL** → Downgrade xuống **HIGH**
- Đảm bảo user mới không thể tạo báo cáo khẩn cấp không cần thiết

---

### 2. Các mức độ ưu tiên (Priority Levels)

#### 2.1. CRITICAL

**Tiêu chí**:

- Nguy hiểm tính mạng
- Cháy nổ, điện giật
- Nước tràn lớn gây thiệt hại
- Ảnh hưởng nghiêm trọng đến an toàn

**Thời gian xử lý**: 1-2 ngày

**Ví dụ**:

- "Mất điện toàn bộ tòa nhà, có mùi cháy"
- "Nước tràn từ tầng 3 xuống, có nguy cơ chập điện"
- "Cửa ra vào bị kẹt, không thể thoát hiểm"

#### 2.2. HIGH

**Tiêu chí**:

- Ảnh hưởng nhiều người
- Phòng học/lab không thể sử dụng
- Cần xử lý trong ngày

**Thời gian xử lý**: 2-3 ngày

**Ví dụ**:

- "Mất điện phòng học, không thể học được"
- "Điều hòa không hoạt động, phòng nóng"
- "Mạng WiFi chậm, không thể làm việc"

#### 2.3. MEDIUM

**Tiêu chí**:

- Ảnh hưởng ít người
- Không cần xử lý gấp
- Có thể đợi 1-2 ngày

**Thời gian xử lý**: 3-5 ngày

**Ví dụ**:

- "Bóng đèn phòng hành chính bị hỏng"
- "Vòi nước rò rỉ nhỏ"
- "Bàn ghế bị lỏng chân"

#### 2.4. LOW

**Tiêu chí**:

- Vấn đề nhỏ
- Không ảnh hưởng sử dụng
- Có thể xử lý sau

**Thời gian xử lý**: 5-7 ngày

**Ví dụ**:

- "Bảng thông báo bị hỏng"
- "Sơn tường bị bong"
- "Cửa sổ kẹt nhẹ"

---

### 3. Các loại sự cố (Categories)

#### 3.1. DIEN (Điện)

- Mất điện, chập điện
- Bóng đèn, công tắc, ổ cắm
- Hệ thống điện

**Suggested Skills**: `["electrician", "electrical_safety"]`

#### 3.2. NUOC (Nước)

- Rò rỉ, tắc nghẽn
- Vòi nước, nhà vệ sinh
- Hệ thống cấp nước

**Suggested Skills**: `["plumber", "water_system"]`

#### 3.3. MANG (Mạng)

- Mạng Internet, WiFi
- Hệ thống mạng LAN
- Kết nối mạng

**Suggested Skills**: `["network_technician", "it_support"]`

#### 3.4. NOI_THAT (Nội thất)

- Bàn ghế, cửa sổ
- Bảng, tủ
- Thiết bị nội thất

**Suggested Skills**: `["carpenter", "general_maintenance"]`

#### 3.5. DIEU_HOA (Điều hòa)

- Điều hòa nhiệt độ
- Quạt, hệ thống làm mát
- HVAC

**Suggested Skills**: `["hvac_technician", "air_conditioning"]`

#### 3.6. VE_SINH (Vệ sinh)

- Vệ sinh, rác thải
- Môi trường
- Dọn dẹp

**Suggested Skills**: `["cleaning_staff", "waste_management"]`

#### 3.7. AN_NINH (An ninh)

- An ninh, cửa ra vào
- Khóa, camera
- Hệ thống bảo mật

**Suggested Skills**: `["security", "lock_repair"]`

#### 3.8. KHAC (Khác)

- Các vấn đề không thuộc danh mục trên

---

### 4. Dự báo thời gian hoàn thành (Processing Days)

#### 4.1. Cách tính

**Bước 1**: AI phân tích mô tả sự cố và priority

**Bước 2**: Tìm kiếm quy định từ RAG knowledge base

- Nếu có quy định cụ thể → Ưu tiên sử dụng quy định
- Nếu không có → Sử dụng quy tắc mặc định

**Bước 3**: Dựa vào priority level:

```typescript
switch (priority) {
  case 'CRITICAL':
    return 1; // 1-2 ngày
  case 'HIGH':
    return 2; // 2-3 ngày
  case 'MEDIUM':
    return 3; // 3-5 ngày
  case 'LOW':
    return 5; // 5-7 ngày
  default:
    return 3;
}
```

**Bước 4**: Điều chỉnh dựa trên độ phức tạp:

- Đơn giản: -0.5 đến -1 ngày
- Phức tạp: +1 đến +2 ngày

#### 4.2. Lưu trong Report

```typescript
{
  priority: "HIGH",
  suggestedProcessingDays: 2,  // Từ AI
  // ...
}
```

**Lưu ý**: `suggestedProcessingDays` chỉ là gợi ý, admin/staff có thể điều chỉnh khi xử lý.

---

## API Endpoints

### 1. Phân loại báo cáo

**POST** `/api/ai/classify/report`

**Request**:

```json
{
  "description": "Mất điện tại phòng học A101, không thể học được",
  "location": "Phòng học A101" // optional
}
```

**Response**:

```json
{
  "success": true,
  "message": "Phân loại báo cáo thành công",
  "data": {
    "category": "DIEN",
    "priority": "HIGH",
    "suggestedStaffSkills": ["electrician", "electrical_safety"],
    "estimatedDuration": 120,
    "processingDays": 2,
    "reasoning": "Sự cố mất điện ảnh hưởng đến việc học tập, cần xử lý trong ngày",
    "confidence": 0.9
  }
}
```

### 2. Đề xuất priority

**POST** `/api/ai/classify/suggest-priority`

**Request**:

```json
{
  "description": "Bóng đèn phòng hành chính bị hỏng"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Đề xuất độ ưu tiên thành công",
  "data": {
    "priority": "MEDIUM"
  }
}
```

---

## Prompt Engineering

### Prompt Template

```
Bạn là hệ thống AI phân loại báo cáo sự cố tại Trường Đại học Công nghiệp TP.HCM.

MÔ TẢ SỰ CỐ:
{description}

ĐỊA ĐIỂM: {location} // optional

YÊU CẦU: Phân tích và trả về JSON với format chính xác:
{
  "category": "DIEN|NUOC|MANG|...",
  "priority": "CRITICAL|HIGH|MEDIUM|LOW",
  "suggestedStaffSkills": ["skill1", "skill2"],
  "estimatedDuration": 60,
  "processingDays": 3,
  "reasoning": "Lý do phân loại",
  "confidence": 0.85
}

[Định nghĩa categories]
[Định nghĩa priorities]
[Định nghĩa suggested skills]
[Định nghĩa estimated duration]
[Định nghĩa processing days]

{processingTimeContext} // Quy định từ RAG (nếu có)

QUAN TRỌNG: Nếu có quy định thời gian xử lý từ cơ sở dữ liệu ở trên,
HÃY ƯU TIÊN SỬ DỤNG quy định đó để đưa ra processingDays chính xác nhất.

CHỈ TRẢ VỀ JSON, KHÔNG THÊM TEXT KHÁC.
```

### Temperature và MaxTokens

- **Temperature: 0.2** - Thấp để đảm bảo consistency và độ chính xác
- **MaxTokens: 500** - Đủ cho JSON response (không quá dài)

---

## Error Handling

### 1. AI Service Fail

**Fallback**:

```typescript
catch (error) {
  // Fallback to default classification
  return {
    category: 'KHAC',
    priority: 'MEDIUM',
    suggestedStaffSkills: [],
    estimatedDuration: 60,
    processingDays: 3,
    reasoning: 'Không thể phân loại tự động',
    confidence: 0.5,
  };
}
```

### 2. RAG Service Fail

**Behavior**:

- Log warning nhưng không throw error
- Tiếp tục với classification mà không có quy định từ RAG
- Sử dụng quy tắc mặc định

### 3. JSON Parse Error

**Behavior**:

- Log error
- Sử dụng defaults cho các fields thiếu
- Vẫn trả về kết quả (có thể không chính xác 100%)

---

## Integration với Report Service

### Khi nào gọi Classification?

- **Tự động**: Khi tạo report mới và user không cung cấp `priority`
- **Manual**: Có thể gọi API `/api/ai/classify/report` để preview trước khi tạo

### Validation

1. **GUEST User**:
   - Không thể set priority = CRITICAL
   - Nếu AI classify là CRITICAL → Downgrade xuống HIGH

2. **First-time Reporter**:
   - Không thể set priority = CRITICAL
   - Đảm bảo user mới không lạm dụng

### Saved Fields

```typescript
{
  priority: "HIGH",              // Từ AI hoặc user input
  suggestedProcessingDays: 2,    // Luôn từ AI
  // ... other fields
}
```

---

## Ví dụ luồng hoàn chỉnh

### Scenario: User báo cáo "Mất điện phòng học"

1. **User**: `POST /api/report` với description: "Mất điện tại phòng học A101, không thể học được"

2. **ReportService**:
   - Không có `priority` trong request
   - Gọi `classificationService.classifyReport()`

3. **ClassificationService**:
   - Tìm kiếm quy định: "quy định thời gian xử lý sự cố mất điện"
   - Tìm thấy: "Sự cố điện tại phòng học: xử lý trong 2 ngày"
   - Build prompt với context
   - Gọi AI: Gemini chat completion

4. **AI Response**:

   ```json
   {
     "category": "DIEN",
     "priority": "HIGH",
     "suggestedStaffSkills": ["electrician"],
     "estimatedDuration": 120,
     "processingDays": 2,
     "reasoning": "Mất điện ảnh hưởng học tập, cần xử lý trong ngày",
     "confidence": 0.9
   }
   ```

5. **ReportService**:
   - Set `priority = "HIGH"`
   - Set `suggestedProcessingDays = 2`
   - Lưu report

6. **Result**: Report được tạo với priority HIGH và suggestedProcessingDays = 2 ngày

---

## Tối ưu hóa và Best Practices

### 1. Caching

- Có thể cache classification results cho các mô tả tương tự
- Giảm API calls và chi phí

### 2. Batch Classification

- Khi cần classify nhiều reports → Có thể batch để tối ưu

### 3. Feedback Loop

- Theo dõi accuracy của classification
- So sánh `suggestedProcessingDays` với thời gian thực tế
- Fine-tune prompt dựa trên feedback

### 4. Monitoring

- Log tất cả classification requests
- Track confidence scores
- Alert nếu confidence quá thấp (< 0.5)

---

## Troubleshooting

### 1. Classification không chính xác

**Nguyên nhân**:

- Mô tả quá ngắn hoặc không rõ ràng
- Prompt không đủ chi tiết

**Giải pháp**:

- Yêu cầu user mô tả chi tiết hơn
- Improve prompt với nhiều examples hơn
- Adjust temperature nếu cần

### 2. ProcessingDays không khớp với quy định

**Nguyên nhân**:

- RAG không tìm thấy quy định
- Quy định không được index đúng

**Giải pháp**:

- Kiểm tra knowledge base có regulation documents không
- Đảm bảo documents được index với `sourceType = 'regulation'`

### 3. AI Service timeout

**Nguyên nhân**:

- API rate limit
- Network issues

**Giải pháp**:

- Implement retry logic
- Use fallback defaults
- Monitor API health

---

## Tài liệu tham khảo

- [Report Schema](../report/schema/report.schema.ts)
- [Classification Service](./services/classification.service.ts)
- [Report Service](../report/report.service.ts)
- [RAG Service](./services/rag.service.ts)
