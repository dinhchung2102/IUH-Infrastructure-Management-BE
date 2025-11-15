# Zone - Area - Building API Documentation

## Tổng quan

Hệ thống quản lý cấu trúc không gian gồm 3 cấp độ:
- **Campus**: Cơ sở (cao nhất)
- **Building**: Tòa nhà (thuộc Campus)
- **Area**: Khu vực ngoài trời (thuộc Campus)
- **Zone**: Khu vực nhỏ nhất (thuộc Building HOẶC Area)

### Quan hệ giữa các entity

```
Campus
├── Building (tòa nhà)
│   └── Zone (khu vực trong tòa nhà, có floorLocation)
└── Area (khu vực ngoài trời)
    └── Zone (khu vực ngoài trời, không có floorLocation)
```

**Lưu ý quan trọng:**
- Zone chỉ có thể thuộc **một trong hai**: Building HOẶC Area (không được cả hai)
- Zone trong Building: **bắt buộc** có `floorLocation`
- Zone trong Area: **không được** có `floorLocation`

---

## Enums

### CommonStatus
```typescript
ACTIVE | INACTIVE | UNDERMAINTENANCE
```

### ZoneType
```typescript
FUNCTIONAL | TECHNICAL | SERVICE | PUBLIC
```

---

## 1. AREA API (Khu vực ngoài trời)

### 1.1. Tạo Area
**POST** `/zone-area/areas`

**Auth:** Required (Permission: `AREA:CREATE`)

**Request Body:**
```json
{
  "name": "Công viên trung tâm",
  "status": "ACTIVE",
  "description": "Khu vực công viên phục vụ sinh viên",
  "campus": "campus_id",
  "zoneType": "PUBLIC"
}
```

**Response:**
```json
{
  "message": "Tạo khu vực thành công",
  "data": {
    "_id": "area_id",
    "name": "Công viên trung tâm",
    "status": "ACTIVE",
    "description": "Khu vực công viên phục vụ sinh viên",
    "campus": {
      "_id": "campus_id",
      "name": "Cơ sở 1",
      "address": "..."
    },
    "zoneType": "PUBLIC",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 1.2. Lấy danh sách Area
**GET** `/zone-area/areas`

**Auth:** Public

**Query Parameters:**
- `search` (string, optional): Tìm kiếm theo tên hoặc mô tả
- `status` (CommonStatus, optional): Lọc theo trạng thái
- `campus` (string, optional): Lọc theo campus ID
- `zoneType` (ZoneType, optional): Lọc theo loại khu vực
- `page` (string, default: "1"): Số trang
- `limit` (string, default: "10"): Số lượng mỗi trang
- `sortBy` (string, default: "createdAt"): Trường sắp xếp
- `sortOrder` ("asc" | "desc", default: "desc"): Thứ tự sắp xếp

**Response:**
```json
{
  "message": "Lấy danh sách khu vực thành công",
  "areas": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10
  }
}
```

### 1.3. Lấy chi tiết Area
**GET** `/zone-area/areas/:id`

**Auth:** Public

**Response:**
```json
{
  "message": "Lấy thông tin khu vực thành công",
  "data": {
    "_id": "area_id",
    "name": "Công viên trung tâm",
    "status": "ACTIVE",
    "description": "...",
    "campus": {...},
    "zoneType": "PUBLIC",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### 1.4. Cập nhật Area
**PATCH** `/zone-area/areas/:id`

**Auth:** Required (Permission: `AREA:UPDATE`)

**Request Body:** (Tất cả fields đều optional)
```json
{
  "name": "Công viên trung tâm (cập nhật)",
  "status": "INACTIVE",
  "description": "...",
  "campus": "campus_id",
  "zoneType": "PUBLIC"
}
```

**Response:**
```json
{
  "message": "Cập nhật khu vực thành công",
  "data": {...}
}
```

### 1.5. Xóa Area
**DELETE** `/zone-area/areas/:id`

**Auth:** Required (Permission: `AREA:DELETE`)

**Response:**
```json
{
  "message": "Xóa khu vực thành công"
}
```

### 1.6. Lấy danh sách Area theo Campus
**GET** `/zone-area/campus/:campusId/areas`

**Auth:** Public

**Response:**
```json
{
  "message": "Lấy danh sách khu vực theo campus thành công",
  "areas": [...]
}
```

---

## 2. BUILDING API (Tòa nhà)

### 2.1. Tạo Building
**POST** `/zone-area/buildings`

**Auth:** Required (Permission: `BUILDING:CREATE`)

**Request Body:**
```json
{
  "name": "Tòa nhà A",
  "floor": 5,
  "status": "ACTIVE",
  "campus": "campus_id"
}
```

**Response:**
```json
{
  "message": "Tạo tòa nhà thành công",
  "data": {
    "_id": "building_id",
    "name": "Tòa nhà A",
    "floor": 5,
    "status": "ACTIVE",
    "campus": {
      "_id": "campus_id",
      "name": "Cơ sở 1",
      "address": "..."
    },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### 2.2. Lấy danh sách Building
**GET** `/zone-area/buildings`

**Auth:** Public

**Query Parameters:**
- `search` (string, optional): Tìm kiếm theo tên
- `status` (CommonStatus, optional): Lọc theo trạng thái
- `campus` (string, optional): Lọc theo campus ID
- `page` (string, default: "1")
- `limit` (string, default: "10")
- `sortBy` (string, default: "createdAt")
- `sortOrder` ("asc" | "desc", default: "desc")

**Response:**
```json
{
  "message": "Lấy danh sách tòa nhà thành công",
  "buildings": [...],
  "pagination": {...}
}
```

### 2.3. Lấy chi tiết Building
**GET** `/zone-area/buildings/:id`

**Auth:** Public

**Response:**
```json
{
  "message": "Lấy thông tin tòa nhà thành công",
  "data": {
    "_id": "building_id",
    "name": "Tòa nhà A",
    "floor": 5,
    "status": "ACTIVE",
    "campus": {...},
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### 2.4. Cập nhật Building
**PATCH** `/zone-area/buildings/:id`

**Auth:** Required (Permission: `BUILDING:UPDATE`)

**Request Body:** (Tất cả fields đều optional)
```json
{
  "name": "Tòa nhà A (cập nhật)",
  "floor": 6,
  "status": "INACTIVE",
  "campus": "campus_id"
}
```

**Response:**
```json
{
  "message": "Cập nhật tòa nhà thành công",
  "data": {...}
}
```

### 2.5. Xóa Building
**DELETE** `/zone-area/buildings/:id`

**Auth:** Required (Permission: `BUILDING:DELETE`)

**Response:**
```json
{
  "message": "Xóa tòa nhà thành công"
}
```

### 2.6. Lấy danh sách Building theo Campus
**GET** `/zone-area/campus/:campusId/buildings`

**Auth:** Public

**Response:**
```json
{
  "message": "Lấy danh sách tòa nhà theo campus thành công",
  "buildings": [...]
}
```

---

## 3. ZONE API (Khu vực)

### 3.1. Tạo Zone

**POST** `/zone-area/zones`

**Auth:** Required (Permission: `ZONE:CREATE`)

#### Tạo Zone trong Building
**Request Body:**
```json
{
  "name": "Nhà vệ sinh tầng 1",
  "description": "Nhà vệ sinh nam/nữ tầng 1",
  "status": "ACTIVE",
  "building": "building_id",
  "zoneType": "SERVICE",
  "floorLocation": 1
}
```

#### Tạo Zone trong Area
**Request Body:**
```json
{
  "name": "Nhà vệ sinh công viên",
  "description": "Nhà vệ sinh công cộng trong công viên",
  "status": "ACTIVE",
  "area": "area_id",
  "zoneType": "PUBLIC"
}
```

**Lưu ý:**
- Phải có **một trong hai**: `building` HOẶC `area` (không được cả hai)
- Nếu có `building`: **bắt buộc** có `floorLocation`
- Nếu có `area`: **không được** có `floorLocation`

**Response:**
```json
{
  "message": "Tạo khu vực thành công",
  "data": {
    "_id": "zone_id",
    "name": "Nhà vệ sinh tầng 1",
    "description": "...",
    "status": "ACTIVE",
    "building": {
      "_id": "building_id",
      "name": "Tòa nhà A",
      "floor": 5,
      "campus": {
        "_id": "campus_id",
        "name": "Cơ sở 1",
        "address": "..."
      }
    },
    "area": null,
    "zoneType": "SERVICE",
    "floorLocation": 1,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### 3.2. Lấy danh sách Zone
**GET** `/zone-area/zones`

**Auth:** Public

**Query Parameters:**
- `search` (string, optional): Tìm kiếm theo tên hoặc mô tả
- `status` (CommonStatus, optional): Lọc theo trạng thái
- `zoneType` (ZoneType, optional): Lọc theo loại khu vực
- `building` (string, optional): Lọc theo building ID
- `area` (string, optional): Lọc theo area ID
- `campus` (string, optional): Lọc theo campus ID (tìm zones trong buildings và areas của campus)
- `floorLocation` (number, optional): Lọc theo tầng (chỉ áp dụng cho zones trong building)
- `page` (string, default: "1")
- `limit` (string, default: "10")
- `sortBy` (string, default: "createdAt")
- `sortOrder` ("asc" | "desc", default: "desc")

**Response:**
```json
{
  "message": "Lấy danh sách khu vực thành công",
  "zones": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10
  }
}
```

### 3.3. Lấy chi tiết Zone
**GET** `/zone-area/zones/:id`

**Auth:** Public

**Response:**
```json
{
  "message": "Lấy thông tin khu vực thành công",
  "data": {
    "_id": "zone_id",
    "name": "Nhà vệ sinh tầng 1",
    "description": "...",
    "status": "ACTIVE",
    "building": {...} hoặc null,
    "area": {...} hoặc null,
    "zoneType": "SERVICE",
    "floorLocation": 1 hoặc null,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### 3.4. Cập nhật Zone
**PATCH** `/zone-area/zones/:id`

**Auth:** Required (Permission: `ZONE:UPDATE`)

**Request Body:** (Tất cả fields đều optional)

**Lưu ý khi cập nhật:**
- Có thể chuyển zone từ building sang area và ngược lại
- Khi chuyển sang building: phải có `floorLocation`
- Khi chuyển sang area: không được có `floorLocation`, sẽ tự động xóa

**Ví dụ chuyển từ Building sang Area:**
```json
{
  "area": "area_id",
  "building": null,
  "floorLocation": null
}
```

**Ví dụ chuyển từ Area sang Building:**
```json
{
  "building": "building_id",
  "area": null,
  "floorLocation": 2
}
```

**Response:**
```json
{
  "message": "Cập nhật khu vực thành công",
  "data": {...}
}
```

### 3.5. Xóa Zone
**DELETE** `/zone-area/zones/:id`

**Auth:** Required (Permission: `ZONE:DELETE`)

**Response:**
```json
{
  "message": "Xóa khu vực thành công"
}
```

### 3.6. Lấy danh sách Zone theo Building
**GET** `/zone-area/buildings/:buildingId/zones`

**Auth:** Public

**Response:**
```json
{
  "message": "Lấy danh sách khu vực theo tòa nhà thành công",
  "zones": [
    {
      "_id": "zone_id",
      "name": "Nhà vệ sinh tầng 1",
      "floorLocation": 1,
      "building": {...},
      "area": null,
      ...
    }
  ]
}
```

### 3.7. Lấy danh sách Zone theo Area
**GET** `/zone-area/areas/:areaId/zones`

**Auth:** Public

**Response:**
```json
{
  "message": "Lấy danh sách khu vực theo khu vực ngoài trời thành công",
  "zones": [
    {
      "_id": "zone_id",
      "name": "Nhà vệ sinh công viên",
      "floorLocation": null,
      "building": null,
      "area": {...},
      ...
    }
  ]
}
```

### 3.8. Lấy danh sách Zone theo Building và Tầng
**GET** `/zone-area/buildings/:buildingId/zones/floor/:floor`

**Auth:** Public

**Response:**
```json
{
  "message": "Lấy danh sách khu vực theo tòa nhà và tầng thành công",
  "zones": [...]
}
```

---

## 4. STATISTICS API

### 4.1. Thống kê Building
**GET** `/zone-area/buildings-stats`

**Auth:** Public

**Response:**
```json
{
  "message": "Lấy thống kê tòa nhà thành công",
  "stats": {...}
}
```

### 4.2. Thống kê Area
**GET** `/zone-area/areas-stats`

**Auth:** Public

**Response:**
```json
{
  "message": "Lấy thống kê khu vực thành công",
  "stats": {...}
}
```

### 4.3. Thống kê Zone
**GET** `/zone-area/zones-stats`

**Auth:** Public

**Response:**
```json
{
  "message": "Lấy thống kê khu vực thành công",
  "stats": {...}
}
```

---

## Error Responses

Tất cả các endpoint có thể trả về các lỗi sau:

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Tên khu vực không được để trống",
  "error": "Bad Request"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Khu vực không tồn tại",
  "error": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Tên khu vực đã tồn tại",
  "error": "Conflict"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

---

## Validation Rules

### Area
- `name`: 2-100 ký tự, unique
- `description`: 10-500 ký tự
- `status`: ACTIVE | INACTIVE | UNDERMAINTENANCE
- `campus`: Required, valid MongoDB ObjectId
- `zoneType`: FUNCTIONAL | TECHNICAL | SERVICE | PUBLIC

### Building
- `name`: 2-100 ký tự, unique
- `floor`: 1-100
- `status`: ACTIVE | INACTIVE | UNDERMAINTENANCE
- `campus`: Required, valid MongoDB ObjectId

### Zone
- `name`: 2-100 ký tự, unique
- `description`: 10-500 ký tự
- `status`: ACTIVE | INACTIVE | UNDERMAINTENANCE
- `zoneType`: FUNCTIONAL | TECHNICAL | SERVICE | PUBLIC
- `building` HOẶC `area`: Phải có một trong hai (không được cả hai)
- `floorLocation`: 
  - Required nếu có `building` (1-100, không vượt quá `building.floor`)
  - Không được có nếu có `area`

---

## Notes cho Frontend

1. **Khi tạo Zone:**
   - Nếu chọn Building → bắt buộc nhập `floorLocation` và validate không vượt quá số tầng của building
   - Nếu chọn Area → không hiển thị field `floorLocation`

2. **Khi cập nhật Zone:**
   - Có thể chuyển đổi giữa Building và Area
   - Khi chuyển đổi, cần clear field không liên quan

3. **Khi hiển thị Zone:**
   - Kiểm tra `building` hoặc `area` để hiển thị thông tin phù hợp
   - Zone trong Building: hiển thị "Tòa nhà X - Tầng Y"
   - Zone trong Area: hiển thị "Khu vực X"

4. **Filter và Search:**
   - Có thể filter theo `campus` để lấy tất cả zones (trong buildings và areas) của campus đó
   - Search hoạt động trên tên và mô tả

