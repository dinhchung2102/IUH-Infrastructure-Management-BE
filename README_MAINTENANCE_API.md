# API Quản Lý Bảo Trì (Maintenance)

## Tổng Quan

Module quản lý bảo trì cho phép admin tạo và quản lý lịch bảo trì cho các thiết bị. Hệ thống sẽ nhắc nhở khi đến thời điểm bảo trì và admin có thể gán nhiệm vụ cho nhân viên.

---

## 1. Tạo Lịch Bảo Trì

**Endpoint:** `POST /api/maintenance`

**Headers:**

```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Request Body (Form Data):**

- `asset` (string, required): ID thiết bị
- `title` (string, required): Tiêu đề (5-200 ký tự)
- `description` (string, required): Mô tả (10-1000 ký tự)
- `status` (enum, optional): Trạng thái (PENDING, IN_PROGRESS, COMPLETED, CANCELLED, OVERDUE) - default: PENDING
- `priority` (enum, optional): Độ ưu tiên (LOW, MEDIUM, HIGH, CRITICAL) - default: MEDIUM
- `scheduledDate` (string, required): Ngày dự kiến bảo trì (ISO 8601)
- `assignedTo` (array, optional): Danh sách ID nhân viên được gán
- `notes` (string, optional): Ghi chú (tối đa 500 ký tự)
- `images` (files, optional): Hình ảnh liên quan

**Response Success (201):**

```json
{
  "success": true,
  "message": "Tạo lịch bảo trì thành công",
  "data": {
    "_id": "6933b07974bfc2f0e8426f1b",
    "asset": {
      "_id": "...",
      "name": "Máy tính Dell",
      "code": "PC001",
      "status": "IN_USE"
    },
    "title": "Bảo trì định kỳ máy tính",
    "description": "Kiểm tra và vệ sinh máy tính định kỳ",
    "status": "PENDING",
    "priority": "MEDIUM",
    "scheduledDate": "2025-12-15T00:00:00.000Z",
    "createdBy": {
      "_id": "...",
      "fullName": "Admin User",
      "email": "admin@iuh.edu.vn"
    },
    "assignedTo": [
      {
        "_id": "...",
        "fullName": "Nguyễn Văn A",
        "email": "nguyenvana@iuh.edu.vn"
      }
    ],
    "createdAt": "2025-12-07T00:00:00.000Z",
    "updatedAt": "2025-12-07T00:00:00.000Z"
  }
}
```

---

## 2. Lấy Danh Sách Lịch Bảo Trì

**Endpoint:** `GET /api/maintenance`

**Headers:**

```
Authorization: Bearer {token}
```

**Query Parameters:**

- `search` (string, optional): Tìm kiếm theo tiêu đề, mô tả, ghi chú
- `status` (enum, optional): Lọc theo trạng thái
- `priority` (enum, optional): Lọc theo độ ưu tiên
- `asset` (string, optional): Lọc theo ID thiết bị
- `assignedTo` (string, optional): Lọc theo ID nhân viên được gán
- `startDate` (string, optional): Ngày bắt đầu (ISO 8601) - lọc theo scheduledDate >= startDate
- `endDate` (string, optional): Ngày kết thúc (ISO 8601) - lọc theo scheduledDate <= endDate
- `page` (string, optional): Số trang (default: "1")
- `limit` (string, optional): Số lượng mỗi trang (default: "10")
- `sortBy` (string, optional): Trường sắp xếp (default: "scheduledDate")
- `sortOrder` (string, optional): Thứ tự (asc/desc, default: "asc")

**Response Success (200):**

```json
{
  "success": true,
  "message": "Lấy danh sách lịch bảo trì thành công",
  "data": {
    "maintenances": [
      {
        "_id": "6933b07974bfc2f0e8426f1b",
        "title": "Bảo trì định kỳ máy tính",
        "status": "PENDING",
        "priority": "MEDIUM",
        "scheduledDate": "2025-12-15T00:00:00.000Z",
        "asset": {...},
        "createdBy": {...},
        "assignedTo": [...]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  }
}
```

---

## 3. Lấy Chi Tiết Lịch Bảo Trì

**Endpoint:** `GET /api/maintenance/:id`

**Headers:**

```
Authorization: Bearer {token}
```

**Path Parameters:**

- `id` (string, required): ID lịch bảo trì

**Response Success (200):**

```json
{
  "success": true,
  "message": "Lấy thông tin lịch bảo trì thành công",
  "data": {
    "_id": "6933b07974bfc2f0e8426f1b",
    "title": "Bảo trì định kỳ máy tính",
    "description": "Kiểm tra và vệ sinh máy tính định kỳ",
    "status": "PENDING",
    "priority": "MEDIUM",
    "scheduledDate": "2025-12-15T00:00:00.000Z",
    "asset": {...},
    "createdBy": {...},
    "assignedTo": [...],
    "notes": "Cần kiểm tra kỹ phần quạt tản nhiệt",
    "images": ["/uploads/image1.jpg"]
  }
}
```

---

## 4. Cập Nhật Lịch Bảo Trì

**Endpoint:** `PATCH /api/maintenance/:id`

**Headers:**

```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Path Parameters:**

- `id` (string, required): ID lịch bảo trì

**Request Body (Form Data):**

- Tất cả các field giống như tạo mới, nhưng tất cả đều optional
- `completedDate` (string, optional): Ngày hoàn thành (nếu set sẽ tự động cập nhật status = COMPLETED)
- `images` (files, optional): Hình ảnh mới

**Response Success (200):**

```json
{
  "success": true,
  "message": "Cập nhật lịch bảo trì thành công",
  "data": {
    "_id": "6933b07974bfc2f0e8426f1b",
    "status": "COMPLETED",
    "completedDate": "2025-12-15T10:30:00.000Z",
    ...
  }
}
```

---

## 5. Xóa Lịch Bảo Trì

**Endpoint:** `DELETE /api/maintenance/:id`

**Headers:**

```
Authorization: Bearer {token}
```

**Path Parameters:**

- `id` (string, required): ID lịch bảo trì

**Response Success (200):**

```json
{
  "success": true,
  "message": "Xóa lịch bảo trì thành công"
}
```

---

## 6. Lấy Danh Sách Lịch Bảo Trì Quá Hạn

**Endpoint:** `GET /api/maintenance/overdue`

**Headers:**

```
Authorization: Bearer {token}
```

**Response Success (200):**

```json
{
  "success": true,
  "message": "Lấy danh sách lịch bảo trì quá hạn thành công",
  "data": [
    {
      "_id": "6933b07974bfc2f0e8426f1b",
      "title": "Bảo trì định kỳ máy tính",
      "status": "OVERDUE",
      "scheduledDate": "2025-12-01T00:00:00.000Z",
      "asset": {...},
      ...
    }
  ]
}
```

**Lưu ý:** Endpoint này tự động cập nhật status thành `OVERDUE` cho các lịch bảo trì có `scheduledDate` < hôm nay và status là `PENDING` hoặc `IN_PROGRESS`.

---

## 7. Lấy Danh Sách Lịch Bảo Trì Sắp Tới

**Endpoint:** `GET /api/maintenance/upcoming`

**Headers:**

```
Authorization: Bearer {token}
```

**Query Parameters:**

- `days` (string, optional): Số ngày sắp tới (default: 7)

**Response Success (200):**

```json
{
  "success": true,
  "message": "Lấy danh sách lịch bảo trì sắp tới (7 ngày) thành công",
  "data": [
    {
      "_id": "6933b07974bfc2f0e8426f1b",
      "title": "Bảo trì định kỳ máy tính",
      "status": "PENDING",
      "scheduledDate": "2025-12-10T00:00:00.000Z",
      "asset": {...},
      ...
    }
  ]
}
```

---

## Trạng Thái (Status)

- `PENDING`: Đang chờ
- `IN_PROGRESS`: Đang thực hiện
- `COMPLETED`: Đã hoàn thành
- `CANCELLED`: Đã hủy
- `OVERDUE`: Quá hạn (tự động cập nhật)

## Độ Ưu Tiên (Priority)

- `LOW`: Thấp
- `MEDIUM`: Trung bình
- `HIGH`: Cao
- `CRITICAL`: Khẩn cấp

---

## Permissions

- **CREATE:** `MAINTENANCE:CREATE`
- **READ:** `MAINTENANCE:READ`
- **UPDATE:** `MAINTENANCE:UPDATE`
- **DELETE:** `MAINTENANCE:DELETE`

---

## Lưu Ý

1. **Auto Status Update:**
   - Khi set `completedDate`, status sẽ tự động chuyển thành `COMPLETED`
   - Khi set status = `COMPLETED`, `completedDate` sẽ tự động được set = thời điểm hiện tại
   - Endpoint `/overdue` tự động cập nhật status thành `OVERDUE` cho các lịch quá hạn

2. **File Upload:**
   - Field name phải là `images`
   - Có thể upload nhiều file cùng lúc
   - Định dạng: JPEG, PNG, GIF, WebP
   - Kích thước tối đa: 10MB/file

3. **Scheduled Date:**
   - Phải là ngày trong tương lai hoặc hôm nay
   - Format: ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)

4. **Date Range Query:**
   - `startDate` và `endDate` dùng để lọc lịch bảo trì theo khoảng thời gian
   - Có thể chỉ dùng `startDate` (>= startDate) hoặc chỉ `endDate` (<= endDate) hoặc cả hai
   - Format: ISO 8601 (YYYY-MM-DD hoặc YYYY-MM-DDTHH:mm:ss.sssZ)

---

## Ví Dụ Sử Dụng (JavaScript/Fetch)

```javascript
// Tạo lịch bảo trì mới
const formData = new FormData();
formData.append('asset', '6933b07974bfc2f0e8426f1b');
formData.append('title', 'Bảo trì định kỳ máy tính');
formData.append('description', 'Kiểm tra và vệ sinh máy tính định kỳ');
formData.append('priority', 'MEDIUM');
formData.append('scheduledDate', '2025-12-15T00:00:00.000Z');
formData.append('assignedTo[]', '6933b07974bfc2f0e8426f1c');
formData.append('images', fileInput.files[0]);

fetch('https://api.iuh.nagentech.com/api/maintenance', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer YOUR_TOKEN',
  },
  body: formData,
})
  .then((res) => res.json())
  .then((data) => console.log(data));

// Lấy danh sách lịch bảo trì quá hạn
fetch('https://api.iuh.nagentech.com/api/maintenance/overdue', {
  headers: {
    Authorization: 'Bearer YOUR_TOKEN',
  },
})
  .then((res) => res.json())
  .then((data) => {
    console.log('Overdue maintenances:', data.data);
  });

// Lấy lịch bảo trì sắp tới (14 ngày)
fetch('https://api.iuh.nagentech.com/api/maintenance/upcoming?days=14', {
  headers: {
    Authorization: 'Bearer YOUR_TOKEN',
  },
})
  .then((res) => res.json())
  .then((data) => {
    console.log('Upcoming maintenances:', data.data);
  });

// Lấy lịch bảo trì theo khoảng thời gian
fetch(
  'https://api.iuh.nagentech.com/api/maintenance?startDate=2025-12-01&endDate=2025-12-31',
  {
    headers: {
      Authorization: 'Bearer YOUR_TOKEN',
    },
  },
)
  .then((res) => res.json())
  .then((data) => {
    console.log('Maintenances in date range:', data.data);
  });
```
