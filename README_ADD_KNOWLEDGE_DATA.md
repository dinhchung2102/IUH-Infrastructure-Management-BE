# Hướng Dẫn Thêm Data Cho AI Chatbot

## Tổng Quan

Để AI chatbot có thể trả lời các câu hỏi về trường, cơ sở vật chất, quy trình, v.v., cần thêm data vào Knowledge Base. Hệ thống sẽ tự động sync vào Qdrant để chatbot có thể tìm kiếm.

## Loại Data (Knowledge Types)

- **FAQ**: Câu hỏi thường gặp
- **SOP**: Quy trình xử lý (Standard Operating Procedures)
- **FACILITIES**: Thông tin về cơ sở vật chất, địa điểm
- **GENERAL**: Thông tin chung về trường

---

## API Endpoints

### 1. Tạo Single Knowledge

**POST** `/api/knowledge-base`

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Permissions Required:** `KNOWLEDGE:CREATE`

**Request Body:**

```json
{
  "title": "Phòng Quản trị ở đâu?",
  "content": "Phòng Quản trị nằm ở tầng 1, tòa nhà A, cơ sở Nguyễn Văn Bảo. Giờ làm việc: 7h30 - 17h00 từ thứ 2 đến thứ 6.",
  "type": "FAQ",
  "category": "campus-info",
  "tags": ["phòng quản trị", "địa điểm", "giờ làm việc"],
  "metadata": {
    "building": "Tòa A",
    "floor": 1,
    "campus": "Nguyễn Văn Bảo"
  }
}
```

**Response (201):**

```json
{
  "message": "Tạo kiến thức thành công",
  "data": {
    "_id": "68f0873e003556d78c65df26",
    "title": "Phòng Quản trị ở đâu?",
    "content": "Phòng Quản trị nằm ở tầng 1...",
    "type": "FAQ",
    "category": "campus-info",
    "tags": ["phòng quản trị", "địa điểm"],
    "metadata": {...},
    "isActive": true,
    "createdAt": "2024-12-05T10:00:00.000Z",
    "updatedAt": "2024-12-05T10:00:00.000Z"
  }
}
```

### 2. Tạo Bulk (Nhiều Knowledge Cùng Lúc)

**POST** `/api/knowledge-base/bulk`

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (Array):**

```json
[
  {
    "title": "Phòng Quản trị ở đâu?",
    "content": "Phòng Quản trị nằm ở tầng 1, tòa nhà A...",
    "type": "FAQ",
    "category": "campus-info"
  },
  {
    "title": "Quy trình báo cáo sự cố",
    "content": "Bước 1: Quét QR code...\nBước 2: Điền thông tin...",
    "type": "SOP",
    "category": "procedures"
  }
]
```

**Response (201):**

```json
{
  "message": "Tạo thành công 2 kiến thức",
  "data": {
    "count": 2,
    "items": [...]
  }
}
```

### 3. Lấy Danh Sách Knowledge

**GET** `/api/knowledge-base`

**Public endpoint** (không cần token)

**Query Parameters:**

- `search`: Tìm kiếm theo title/content
- `type`: Lọc theo loại (FAQ, SOP, FACILITIES, GENERAL)
- `category`: Lọc theo danh mục
- `isActive`: true/false
- `page`: Số trang (default: 1)
- `limit`: Số lượng/trang (default: 10)
- `sortBy`: Trường sắp xếp (default: createdAt)
- `sortOrder`: asc/desc (default: desc)

**Example:**

```bash
GET /api/knowledge-base?type=FAQ&category=campus-info&page=1&limit=20
```

**Response (200):**

```json
{
  "message": "Lấy danh sách kiến thức thành công",
  "data": [
    {
      "_id": "...",
      "title": "Phòng Quản trị ở đâu?",
      "content": "...",
      "type": "FAQ",
      "category": "campus-info",
      "tags": ["..."],
      "isActive": true
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 25,
    "itemsPerPage": 10
  }
}
```

### 4. Lấy Chi Tiết Knowledge

**GET** `/api/knowledge-base/:id`

**Public endpoint**

### 5. Cập Nhật Knowledge

**PATCH** `/api/knowledge-base/:id`

**Permissions:** `KNOWLEDGE:UPDATE`

### 6. Xóa Knowledge

**DELETE** `/api/knowledge-base/:id`

**Permissions:** `KNOWLEDGE:DELETE`

---

## Ví Dụ Data Mẫu

### FAQ - Câu Hỏi Thường Gặp

```json
{
  "title": "Làm sao để báo cáo sự cố?",
  "content": "Để báo cáo sự cố, bạn có thể:\n1. Quét mã QR code trên tài sản\n2. Điền thông tin mô tả sự cố\n3. Chụp ảnh minh họa\n4. Nhập email để nhận mã OTP\n5. Xác nhận và gửi báo cáo",
  "type": "FAQ",
  "category": "reporting",
  "tags": ["báo cáo", "sự cố", "qr code"]
}
```

```json
{
  "title": "Thời gian làm việc của Phòng Quản trị?",
  "content": "Phòng Quản trị làm việc từ 7h30 đến 17h00, từ thứ 2 đến thứ 6. Nghỉ trưa từ 12h00 đến 13h00. Không làm việc thứ 7, Chủ nhật và ngày lễ.",
  "type": "FAQ",
  "category": "working-hours",
  "tags": ["giờ làm việc", "phòng quản trị"]
}
```

### FACILITIES - Cơ Sở Vật Chất

```json
{
  "title": "Phòng Quản trị - Tòa A",
  "content": "Phòng Quản trị tọa lạc tại tầng 1, tòa nhà A, cơ sở Nguyễn Văn Bảo. Phòng số A.1.01. Đây là nơi tiếp nhận các yêu cầu và xử lý các vấn đề liên quan đến cơ sở vật chất của trường.",
  "type": "FACILITIES",
  "category": "administrative-offices",
  "tags": ["phòng quản trị", "tòa A", "tầng 1"],
  "metadata": {
    "building": "Tòa A",
    "floor": 1,
    "room": "A.1.01",
    "campus": "Nguyễn Văn Bảo",
    "phone": "028.xxxx.xxxx"
  }
}
```

```json
{
  "title": "Phòng Lab Máy Tính - Tòa H",
  "content": "Phòng Lab máy tính H.3.05 tại tầng 3, tòa H. Trang bị 50 máy tính, máy chiếu, điều hòa. Phục vụ cho các môn học lập trình, tin học văn phòng.",
  "type": "FACILITIES",
  "category": "computer-lab",
  "tags": ["lab", "máy tính", "tòa H", "tầng 3"],
  "metadata": {
    "building": "Tòa H",
    "floor": 3,
    "room": "H.3.05",
    "capacity": 50,
    "equipment": ["computer", "projector", "air-conditioner"]
  }
}
```

### SOP - Quy Trình Xử Lý

```json
{
  "title": "Quy trình xử lý sự cố điện",
  "content": "QUY TRÌNH XỬ LÝ SỰ CỐ ĐIỆN:\n\n1. NGẮT NGUỒN ĐIỆN NGAY LẬP TỨC\n- Ngắt cầu dao tổng tại khu vực sự cố\n- Không chạm vào thiết bị điện\n\n2. BÁO CÁO KHẨN CẤP\n- Gọi điện: 028.xxxx.xxxx (Phòng Quản trị)\n- Hoặc báo cáo qua app với mức độ CRITICAL\n\n3. CÁCH LY KHU VỰC\n- Đặt biển cảnh báo\n- Không cho người vào khu vực nguy hiểm\n\n4. CHỜ NHÂN VIÊN CHUYÊN TRÁCH\n- Chỉ nhân viên có chứng chỉ điện mới được xử lý\n\nTHỜI GIAN XỬ LÝ: Tối đa 30 phút kể từ khi báo cáo",
  "type": "SOP",
  "category": "electrical-emergency",
  "tags": ["điện", "khẩn cấp", "an toàn"],
  "metadata": {
    "priority": "CRITICAL",
    "department": "Bảo trì điện",
    "maxResponseTime": 30
  }
}
```

```json
{
  "title": "Quy trình báo cáo thiết bị hỏng",
  "content": "QUY TRÌNH BÁO CÁO THIẾT BỊ HỎNG:\n\n1. KIỂM TRA THIẾT BỊ\n- Xác định tên thiết bị và vị trí\n- Kiểm tra mức độ hư hỏng\n\n2. QUÉT QR CODE\n- Mỗi thiết bị có QR code riêng\n- Quét để tự động điền thông tin\n\n3. ĐIỀN FORM BÁO CÁO\n- Chọn loại sự cố\n- Mô tả chi tiết (tối thiểu 10 ký tự)\n- Chụp ảnh minh họa (tối thiểu 1 ảnh)\n\n4. XÁC THỰC EMAIL\n- Nhập email\n- Nhận mã OTP\n- Nhập OTP để xác nhận\n\n5. THEO DÕI\n- Nhận email thông báo khi có cập nhật\n- Kiểm tra trạng thái qua app",
  "type": "SOP",
  "category": "reporting-procedure",
  "tags": ["báo cáo", "thiết bị", "quy trình"],
  "metadata": {
    "estimatedTime": 5,
    "difficulty": "easy"
  }
}
```

### GENERAL - Thông Tin Chung

```json
{
  "title": "Về Trường Đại học Công nghiệp TP.HCM",
  "content": "Trường Đại học Công nghiệp Thành phố Hồ Chí Minh (IUH) được thành lập năm 2004. Trường có 2 cơ sở chính:\n\n1. Cơ sở Nguyễn Văn Bảo (Quận 5): Cơ sở chính với đầy đủ khoa, phòng ban\n2. Cơ sở Hóc Môn: Khu thực hành, nghiên cứu\n\nTrường đào tạo các ngành: Công nghệ thông tin, Cơ khí, Điện - Điện tử, Kinh tế, v.v.",
  "type": "GENERAL",
  "category": "about-university",
  "tags": ["iuh", "giới thiệu", "trường đại học"]
}
```

---

## Lưu Ý Quan Trọng ⚠️

**Hiện tại chatbot tìm 0 documents** vì:

1. ✅ Chưa upload `sample-knowledge-data.json`
2. ✅ Qdrant có thể chưa có data

**Giải pháp:**

- Upload file `sample-knowledge-data.json` qua API (xem bên dưới)
- Data sẽ tự động sync vào Qdrant
- Chatbot có thể trả lời ngay

---

## Cách Thêm Data

### Option 1: Upload File (Đơn Giản Nhất) ⭐

**Hỗ trợ 3 loại file:**

- ✅ **JSON** (nhiều items có cấu trúc)
- ✅ **PDF** (trích xuất text thành 1 knowledge)
- ✅ **Word** (.docx, .doc - trích xuất text thành 1 knowledge)

**POST** `/api/knowledge-base/import-file`

```bash
# Upload JSON (nhiều items)
curl -X POST http://localhost:3000/api/knowledge-base/import-file \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@sample-knowledge-data.json"

# Upload PDF (1 knowledge document)
curl -X POST http://localhost:3000/api/knowledge-base/import-file \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf"

# Upload Word (1 knowledge document)
curl -X POST http://localhost:3000/api/knowledge-base/import-file \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@guidelines.docx"
```

**Qua Postman:**

1. POST `http://localhost:3000/api/knowledge-base/import-file`
2. Headers: `Authorization: Bearer YOUR_TOKEN`
3. Body → form-data
4. Key: `file`, Type: File
5. Chọn file (JSON/PDF/Word)
6. Send

### Option 2: Qua API (Từng Item)

```bash
curl -X POST http://localhost:3000/api/knowledge-base \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Phòng Quản trị ở đâu?",
    "content": "Phòng Quản trị nằm ở tầng 1, tòa nhà A...",
    "type": "FAQ",
    "category": "campus-info"
  }'
```

### Option 2: Bulk Import JSON (Nhiều Items)

**Bước 1:** Chuẩn bị file JSON

Tạo file `knowledge-data.json`:

```json
[
  {
    "title": "Phòng Quản trị ở đâu?",
    "content": "...",
    "type": "FAQ",
    "category": "campus-info"
  },
  {
    "title": "Quy trình xử lý sự cố điện",
    "content": "...",
    "type": "SOP",
    "category": "electrical"
  }
]
```

**Bước 2:** Import qua API

```bash
curl -X POST http://localhost:3000/api/knowledge-base/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @knowledge-data.json
```

### Option 3: Upload File JSON (Đơn Giản Nhất) ⭐

**POST** `/api/knowledge-base/import-file`

Upload file `.json` trực tiếp qua form-data.

**Bước 1:** Sử dụng file mẫu sẵn có

Trong project có sẵn file `sample-knowledge-data.json` với data mẫu.

**Bước 2:** Upload qua cURL

```bash
curl -X POST http://localhost:3000/api/knowledge-base/import-file \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@sample-knowledge-data.json"
```

**Bước 3:** Hoặc qua Postman

1. Method: POST
2. URL: `http://localhost:3000/api/knowledge-base/import-file`
3. Headers: `Authorization: Bearer YOUR_TOKEN`
4. Body → form-data:
   - Key: `file`
   - Type: File
   - Value: Chọn file `.json`
5. Send

**Response:**

```json
{
  "message": "Tạo thành công 5 kiến thức",
  "data": {
    "count": 5,
    "items": [...]
  }
}
```

### Option 4: Qua Postman/Insomnia (Manual)

1. Tạo request mới
2. Method: POST
3. URL: `http://localhost:3000/api/knowledge-base`
4. Headers:
   - `Authorization: Bearer YOUR_TOKEN`
   - `Content-Type: application/json`
5. Body (raw JSON): paste JSON data
6. Send

---

## Template Data Mẫu

### FAQ Template

```json
{
  "title": "[Câu hỏi]",
  "content": "[Câu trả lời chi tiết]",
  "type": "FAQ",
  "category": "campus-info|reporting|services|general",
  "tags": ["tag1", "tag2"],
  "isActive": true
}
```

### SOP Template

```json
{
  "title": "Quy trình [Tên quy trình]",
  "content": "BƯỚC 1: ...\n\nBƯỚC 2: ...\n\nBƯỚC 3: ...",
  "type": "SOP",
  "category": "emergency|maintenance|reporting",
  "tags": ["quy trình", "..."],
  "metadata": {
    "priority": "CRITICAL|HIGH|MEDIUM|LOW",
    "estimatedTime": 30
  }
}
```

### FACILITIES Template

```json
{
  "title": "[Tên địa điểm/phòng]",
  "content": "[Mô tả chi tiết về vị trí, trang thiết bị, chức năng]",
  "type": "FACILITIES",
  "category": "classroom|lab|office|public-area",
  "tags": ["địa điểm", "..."],
  "metadata": {
    "building": "Tòa A|B|C|...",
    "floor": 1,
    "room": "A.1.01",
    "campus": "Nguyễn Văn Bảo|Hóc Môn",
    "capacity": 50
  }
}
```

---

## File Mẫu Sẵn (Copy & Paste)

### `faq-data.json`

```json
[
  {
    "title": "Phòng Quản trị ở đâu?",
    "content": "Phòng Quản trị nằm ở tầng 1, tòa nhà A, cơ sở Nguyễn Văn Bảo. Giờ làm việc: 7h30 - 17h00 từ thứ 2 đến thứ 6.",
    "type": "FAQ",
    "category": "campus-info",
    "tags": ["phòng quản trị", "địa điểm"]
  },
  {
    "title": "Làm sao để báo cáo sự cố?",
    "content": "Bạn có thể báo cáo sự cố bằng cách:\n1. Quét QR code trên thiết bị\n2. Truy cập website và điền form\n3. Liên hệ trực tiếp Phòng Quản trị",
    "type": "FAQ",
    "category": "reporting",
    "tags": ["báo cáo", "sự cố"]
  },
  {
    "title": "Thư viện mở cửa mấy giờ?",
    "content": "Thư viện mở cửa từ 7h00 đến 21h00 các ngày trong tuần, kể cả thứ 7. Chủ nhật nghỉ. Sinh viên cần mang thẻ SV để ra vào.",
    "type": "FAQ",
    "category": "library",
    "tags": ["thư viện", "giờ mở cửa"]
  }
]
```

### `facilities-data.json`

```json
[
  {
    "title": "Tòa nhà A - Cơ sở Nguyễn Văn Bảo",
    "content": "Tòa nhà A là tòa nhà chính của trường, có 5 tầng. Bao gồm: Phòng Quản trị (T1), các phòng học (T2-T4), phòng Lab (T5).",
    "type": "FACILITIES",
    "category": "buildings",
    "tags": ["tòa A", "cơ sở chính"],
    "metadata": {
      "building": "Tòa A",
      "floors": 5,
      "campus": "Nguyễn Văn Bảo"
    }
  },
  {
    "title": "Phòng Lab H.3.05",
    "content": "Phòng Lab máy tính H.3.05 tại tầng 3, tòa H. Trang bị 50 máy tính Dell, 1 máy chiếu, điều hòa. Phục vụ các môn: Lập trình C/C++, Java, Python.",
    "type": "FACILITIES",
    "category": "computer-lab",
    "tags": ["lab", "máy tính", "tòa H"],
    "metadata": {
      "building": "Tòa H",
      "floor": 3,
      "room": "H.3.05",
      "capacity": 50
    }
  }
]
```

### `sop-data.json`

```json
[
  {
    "title": "Quy trình xử lý sự cố điện khẩn cấp",
    "content": "1. NGẮT NGUỒN ĐIỆN ngay lập tức\n2. BÁO CÁO khẩn cấp: 028.xxxx.xxxx\n3. CÁCH LY khu vực nguy hiểm\n4. CHỜ nhân viên chuyên trách xử lý",
    "type": "SOP",
    "category": "emergency",
    "tags": ["điện", "khẩn cấp"],
    "metadata": {
      "priority": "CRITICAL",
      "maxResponseTime": 30
    }
  },
  {
    "title": "Quy trình bảo trì định kỳ tài sản",
    "content": "1. Lập lịch bảo trì theo kế hoạch\n2. Kiểm tra tình trạng thiết bị\n3. Thực hiện bảo trì/vệ sinh\n4. Ghi nhận vào hệ thống\n5. Báo cáo nếu phát hiện hư hỏng",
    "type": "SOP",
    "category": "maintenance",
    "tags": ["bảo trì", "định kỳ"]
  }
]
```

---

## Quy Trình Import Data

### Bước 1: Chuẩn Bị Token

```bash
# Login để lấy token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@iuh.com",
    "password": "your_password"
  }'

# Copy access_token từ response
```

### Bước 2: Import FAQ

```bash
curl -X POST http://localhost:3000/api/knowledge-base/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @faq-data.json
```

### Bước 3: Import Facilities

```bash
curl -X POST http://localhost:3000/api/knowledge-base/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @facilities-data.json
```

### Bước 4: Import SOP

```bash
curl -X POST http://localhost:3000/api/knowledge-base/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @sop-data.json
```

### Bước 5: Verify

```bash
# Kiểm tra đã import thành công
curl http://localhost:3000/api/knowledge-base?type=FAQ

# Kiểm tra Qdrant
curl http://localhost:3000/api/ai/sync/status
```

---

## Auto-Sync

Sau khi tạo knowledge mới:

- ✅ Tự động generate embedding
- ✅ Tự động lưu vào Qdrant
- ✅ Tự động có thể search qua chatbot
- ✅ Không cần sync thủ công

---

## Testing Chatbot Sau Khi Thêm Data

### Test FAQ

```bash
curl -X GET "http://localhost:3000/api/ai/chat/faq?q=phòng quản trị" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Trả về câu trả lời về vị trí Phòng Quản trị

### Test Facilities

```bash
curl -X GET "http://localhost:3000/api/ai/chat/facilities?q=lab máy tính" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Trả về thông tin về phòng lab

### Test SOP

```bash
curl -X GET "http://localhost:3000/api/ai/chat/sop?q=xử lý sự cố điện" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Trả về quy trình xử lý

---

## Tips

1. **Content Chi Tiết**: Viết content càng chi tiết càng tốt để AI có context đầy đủ
2. **Tags Đúng**: Thêm tags liên quan để dễ tìm kiếm
3. **Metadata Đầy Đủ**: Thêm metadata (vị trí, tầng, tòa) để filter chính xác
4. **Ngôn Ngữ**: Viết bằng Tiếng Việt có dấu để AI hiểu tốt hơn
5. **Update Thường Xuyên**: Cập nhật khi có thay đổi (giờ làm việc, vị trí, quy trình)

---

## Permissions Required

Admin cần tạo permissions sau:

```sql
-- Trong collection 'permissions'
{
  "resource": "KNOWLEDGE",
  "action": "CREATE",
  "description": "Tạo kiến thức mới"
}
{
  "resource": "KNOWLEDGE",
  "action": "UPDATE",
  "description": "Cập nhật kiến thức"
}
{
  "resource": "KNOWLEDGE",
  "action": "DELETE",
  "description": "Xóa kiến thức"
}
```

Sau đó gán cho role ADMIN hoặc STAFF phù hợp.

---

## Quick Start (Nhanh Nhất) 🚀

### Cách 1: Sử dụng File Mẫu Sẵn Có

```bash
# 1. File sample-knowledge-data.json đã có sẵn trong project
# 2. Upload trực tiếp:
curl -X POST http://localhost:3000/api/knowledge-base/import-file \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample-knowledge-data.json"

# 3. Test ngay:
curl -X GET "http://localhost:3000/api/ai/chat/faq?q=phòng quản trị" \
  -H "Authorization: Bearer $TOKEN"
```

### Cách 2: Qua Postman (Không Cần Terminal)

1. Mở Postman
2. Tạo POST request: `http://localhost:3000/api/knowledge-base/import-file`
3. Headers: `Authorization: Bearer YOUR_TOKEN`
4. Body → form-data → Key: `file`, Type: File
5. Chọn file `sample-knowledge-data.json`
6. Send

✅ Done! Chatbot đã có data và có thể trả lời ngay!

### Verify Data Đã Import

```bash
# Kiểm tra số lượng
curl http://localhost:3000/api/knowledge-base?limit=100

# Kiểm tra từng loại
curl http://localhost:3000/api/knowledge-base?type=FAQ
curl http://localhost:3000/api/knowledge-base?type=SOP
curl http://localhost:3000/api/knowledge-base?type=FACILITIES
```
