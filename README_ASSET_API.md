# API Quản Lý Thiết Bị (Assets)

## 1. Tạo Thiết Bị Mới

**Endpoint:** `POST /api/assets`

**Headers:**

```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Request Body (Form Data):**

- `name` (string, required): Tên thiết bị
- `code` (string, required): Mã thiết bị (unique)
- `status` (enum, required): Trạng thái (IN_USE, MAINTENANCE, RETIRED, DISPOSED)
- `description` (string, required): Mô tả
- `serialNumber` (string, optional): Số serial
- `brand` (string, optional): Thương hiệu
- `assetType` (string, required): ID loại thiết bị
- `assetCategory` (string, required): ID danh mục thiết bị
- `image` (file, optional): Hình ảnh thiết bị (JPEG, PNG, GIF, WebP, max 10MB)
- `warrantyEndDate` (string, optional): Ngày hết bảo hành (ISO 8601)
- `lastMaintenanceDate` (string, optional): Ngày bảo trì cuối (ISO 8601)
- `zone` (string, optional): ID khu vực (phải có zone hoặc area)
- `area` (string, optional): ID vùng (phải có zone hoặc area)
- `properties` (object, optional): Thuộc tính động

**Response Success (201):**

```json
{
  "success": true,
  "message": "Tạo tài sản thành công",
  "data": {
    "_id": "6933b07974bfc2f0e8426f1b",
    "name": "Máy tính Dell",
    "code": "PC001",
    "status": "IN_USE",
    "description": "Máy tính văn phòng",
    "image": "/uploads/1764995826482-x41oko.jpg",
    "assetType": {...},
    "assetCategory": {...},
    "zone": {...},
    "createdAt": "2025-12-06T04:00:00.000Z",
    "updatedAt": "2025-12-06T04:00:00.000Z"
  }
}
```

**Response Error (400/409):**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Mã tài sản đã tồn tại",
  "errorCode": "CONFLICT"
}
```

---

## 2. Cập Nhật Thiết Bị

**Endpoint:** `PATCH /api/assets/:id`

**Headers:**

```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Path Parameters:**

- `id` (string, required): ID thiết bị

**Request Body (Form Data):**

- Tất cả các field giống như tạo mới, nhưng tất cả đều optional
- `image` (file, optional): Hình ảnh mới (nếu upload sẽ thay thế ảnh cũ)

**Response Success (200):**

```json
{
  "success": true,
  "message": "Cập nhật tài sản thành công",
  "data": {
    "_id": "6933b07974bfc2f0e8426f1b",
    "name": "Máy tính Dell (Updated)",
    "code": "PC001",
    "status": "MAINTENANCE",
    "image": "/uploads/1764995826482-new-image.jpg",
    ...
  }
}
```

**Response Error (404):**

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Tài sản không tồn tại",
  "errorCode": "NOT_FOUND"
}
```

---

## 3. Lấy Danh Sách Thiết Bị

**Endpoint:** `GET /api/assets`

**Query Parameters:**

- `search` (string, optional): Tìm kiếm theo tên, mã, mô tả
- `status` (enum, optional): Lọc theo trạng thái
- `assetType` (string, optional): Lọc theo loại thiết bị
- `assetCategory` (string, optional): Lọc theo danh mục
- `zone` (string, optional): Lọc theo khu vực
- `area` (string, optional): Lọc theo vùng
- `page` (string, optional): Số trang (default: "1")
- `limit` (string, optional): Số lượng mỗi trang (default: "10")
- `sortBy` (string, optional): Trường sắp xếp (default: "createdAt")
- `sortOrder` (string, optional): Thứ tự (asc/desc, default: "desc")

**Response Success (200):**

```json
{
  "success": true,
  "message": "Lấy danh sách tài sản thành công",
  "data": {
    "assets": [
      {
        "_id": "6933b07974bfc2f0e8426f1b",
        "name": "Máy tính Dell",
        "code": "PC001",
        "status": "IN_USE",
        "image": "/uploads/1764995826482-x41oko.jpg",
        "assetType": {...},
        "assetCategory": {...},
        ...
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

## 4. Lấy Chi Tiết Thiết Bị

**Endpoint:** `GET /api/assets/:id`

**Path Parameters:**

- `id` (string, required): ID thiết bị

**Response Success (200):**

```json
{
  "success": true,
  "message": "Lấy thông tin tài sản thành công",
  "data": {
    "_id": "6933b07974bfc2f0e8426f1b",
    "name": "Máy tính Dell",
    "code": "PC001",
    "status": "IN_USE",
    "description": "Máy tính văn phòng",
    "image": "/uploads/1764995826482-x41oko.jpg",
    "assetType": {
      "_id": "...",
      "name": "Máy tính"
    },
    "assetCategory": {
      "_id": "...",
      "name": "Thiết bị IT"
    },
    "zone": {
      "_id": "...",
      "name": "Phòng 101"
    },
    ...
  }
}
```

---

## 5. Xóa Thiết Bị

**Endpoint:** `DELETE /api/assets/:id`

**Headers:**

```
Authorization: Bearer {token}
```

**Path Parameters:**

- `id` (string, required): ID thiết bị

**Response Success (200):**

```json
{
  "success": true,
  "message": "Xóa tài sản thành công"
}
```

---

## Lưu Ý

1. **Upload Image:**
   - Field name phải là `image`
   - Định dạng: JPEG, PNG, GIF, WebP
   - Kích thước tối đa: 10MB
   - Nếu không upload, có thể truyền `image` là URL string

2. **Zone/Area:**
   - Phải có ít nhất một trong hai: `zone` hoặc `area`

3. **Code:**
   - Mã thiết bị phải unique (không trùng)

4. **Permissions:**
   - CREATE: `ASSET:CREATE`
   - UPDATE: `ASSET:UPDATE`
   - DELETE: `ASSET:DELETE`
   - READ: Public (không cần token)

---

## Ví Dụ Request (JavaScript/Fetch)

```javascript
// Tạo thiết bị mới với upload ảnh
const formData = new FormData();
formData.append('name', 'Máy tính Dell');
formData.append('code', 'PC001');
formData.append('status', 'IN_USE');
formData.append('description', 'Máy tính văn phòng');
formData.append('assetType', '6931d32f13e5069f077297a8');
formData.append('assetCategory', '6931d32f13e5069f077297a9');
formData.append('zone', '6931d32f13e5069f077297aa');
formData.append('image', fileInput.files[0]); // File từ input

fetch('https://api.iuh.nagentech.com/api/assets', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer YOUR_TOKEN',
  },
  body: formData,
})
  .then((res) => res.json())
  .then((data) => console.log(data));
```

```javascript
// Cập nhật thiết bị với ảnh mới
const formData = new FormData();
formData.append('name', 'Máy tính Dell (Updated)');
formData.append('status', 'MAINTENANCE');
formData.append('image', newFileInput.files[0]); // Ảnh mới

fetch('https://api.iuh.nagentech.com/api/assets/6933b07974bfc2f0e8426f1b', {
  method: 'PATCH',
  headers: {
    Authorization: 'Bearer YOUR_TOKEN',
  },
  body: formData,
})
  .then((res) => res.json())
  .then((data) => console.log(data));
```
