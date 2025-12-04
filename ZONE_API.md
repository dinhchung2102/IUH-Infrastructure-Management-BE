# API Documentation - Zone

## Create Zone
**Endpoint:** `POST /zone-area/zones`  
**Auth:** Required (Permission: `ZONE:CREATE`)

**Request Body:**
```json
{
  "name": "string (required, 2-100 chars)",
  "description": "string (required, 10-500 chars)",
  "status": "ACTIVE | INACTIVE (required)",
  "zoneType": "string (required)",
  "building": "string (optional, MongoId - if zone belongs to building)",
  "area": "string (optional, MongoId - if zone belongs to area)",
  "floorLocation": "number (required if building provided, 1-100)"
}
```

**Notes:**
- Zone phải thuộc về **hoặc** building **hoặc** area (không được cả hai)
- Nếu `building` được cung cấp, `floorLocation` là bắt buộc
- Nếu `area` được cung cấp, `floorLocation` không được phép có

**Response:**
```json
{
  "success": true,
  "message": "Tạo khu vực thành công",
  "data": {
    "_id": "string",
    "name": "string",
    "description": "string",
    "status": "string",
    "zoneType": "string",
    "building": {
      "name": "string",
      "floor": "number",
      "campus": {
        "name": "string",
        "address": "string"
      }
    } | null,
    "area": {
      "name": "string",
      "description": "string",
      "campus": {
        "name": "string",
        "address": "string"
      }
    } | null,
    "floorLocation": "number | null",
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

---

## Get All Zones
**Endpoint:** `GET /zone-area/zones`  
**Auth:** Public

**Request Query Parameters:**
- `search` (optional): Tìm kiếm theo tên hoặc mô tả
- `status` (optional): Lọc theo trạng thái (ACTIVE, INACTIVE)
- `zoneType` (optional): Lọc theo loại zone
- `building` (optional): Lọc theo building ID
- `area` (optional): Lọc theo area ID
- `campus` (optional): Lọc theo campus ID
- `floorLocation` (optional): Lọc theo tầng (số)
- `page` (optional): Số trang (mặc định: 1)
- `limit` (optional): Số lượng mỗi trang (mặc định: 10)
- `sortBy` (optional): Trường sắp xếp (mặc định: createdAt)
- `sortOrder` (optional): Thứ tự sắp xếp - asc hoặc desc (mặc định: desc)

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách khu vực thành công",
  "data": {
    "zones": [
      {
        "_id": "string",
        "name": "string",
        "description": "string",
        "status": "string",
        "zoneType": "string",
        "building": {
          "name": "string",
          "floor": "number",
          "campus": {
            "name": "string",
            "address": "string"
          }
        } | null,
        "area": {
          "name": "string",
          "description": "string",
          "campus": {
            "name": "string",
            "address": "string"
          }
        } | null,
        "floorLocation": "number | null",
        "createdAt": "date",
        "updatedAt": "date"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 100,
      "itemsPerPage": 10
    }
  }
}
```

---

## Get Zone By ID
**Endpoint:** `GET /zone-area/zones/:id`  
**Auth:** Public

**Request:** Path parameter `id` (MongoId)

**Response:**
```json
{
  "success": true,
  "message": "Lấy thông tin khu vực thành công",
  "data": {
    "_id": "string",
    "name": "string",
    "description": "string",
    "status": "string",
    "zoneType": "string",
    "building": {
      "name": "string",
      "floor": "number",
      "campus": {
        "name": "string",
        "address": "string",
        "phone": "string",
        "email": "string"
      }
    } | null,
    "area": {
      "name": "string",
      "description": "string",
      "campus": {
        "name": "string",
        "address": "string",
        "phone": "string",
        "email": "string"
      }
    } | null,
    "floorLocation": "number | null",
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

---

## Update Zone
**Endpoint:** `PATCH /zone-area/zones/:id`  
**Auth:** Required (Permission: `ZONE:UPDATE`)

**Request:** Path parameter `id` (MongoId)

**Request Body:** (Tất cả các trường đều optional, giống CreateZoneDto)
```json
{
  "name": "string",
  "description": "string",
  "status": "ACTIVE | INACTIVE",
  "zoneType": "string",
  "building": "string (MongoId)",
  "area": "string (MongoId)",
  "floorLocation": "number"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cập nhật khu vực thành công",
  "data": {
    "_id": "string",
    "name": "string",
    "description": "string",
    "status": "string",
    "zoneType": "string",
    "building": {
      "name": "string",
      "floor": "number",
      "campus": {
        "name": "string",
        "address": "string"
      }
    } | null,
    "area": {
      "name": "string",
      "description": "string",
      "campus": {
        "name": "string",
        "address": "string"
      }
    } | null,
    "floorLocation": "number | null",
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

---

## Delete Zone
**Endpoint:** `DELETE /zone-area/zones/:id`  
**Auth:** Required (Permission: `ZONE:DELETE`)

**Request:** Path parameter `id` (MongoId)

**Response:**
```json
{
  "success": true,
  "message": "Xóa khu vực thành công"
}
```

---

## Get Zones By Building
**Endpoint:** `GET /zone-area/buildings/:buildingId/zones`  
**Auth:** Public

**Request:** Path parameter `buildingId` (MongoId)

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách khu vực theo tòa nhà thành công",
  "data": {
    "zones": [
      {
        "_id": "string",
        "name": "string",
        "description": "string",
        "status": "string",
        "zoneType": "string",
        "building": {
          "name": "string",
          "floor": "number",
          "campus": {
            "name": "string",
            "address": "string"
          }
        },
        "floorLocation": "number",
        "createdAt": "date",
        "updatedAt": "date"
      }
    ]
  }
}
```

---

## Get Zones By Area
**Endpoint:** `GET /zone-area/areas/:areaId/zones`  
**Auth:** Public

**Request:** Path parameter `areaId` (MongoId)

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách khu vực theo khu vực ngoài trời thành công",
  "data": {
    "zones": [
      {
        "_id": "string",
        "name": "string",
        "description": "string",
        "status": "string",
        "zoneType": "string",
        "area": {
          "name": "string",
          "description": "string",
          "campus": {
            "name": "string",
            "address": "string"
          }
        },
        "createdAt": "date",
        "updatedAt": "date"
      }
    ]
  }
}
```

---

## Get Zones By Building And Floor
**Endpoint:** `GET /zone-area/buildings/:buildingId/zones/floor/:floor`  
**Auth:** Public

**Request:** 
- Path parameter `buildingId` (MongoId)
- Path parameter `floor` (number)

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách khu vực theo tòa nhà và tầng thành công",
  "data": {
    "zones": [
      {
        "_id": "string",
        "name": "string",
        "description": "string",
        "status": "string",
        "zoneType": "string",
        "building": {
          "name": "string",
          "floor": "number",
          "campus": {
            "name": "string",
            "address": "string"
          }
        },
        "floorLocation": "number",
        "createdAt": "date",
        "updatedAt": "date"
      }
    ]
  }
}
```

---

## Get Zone Stats
**Endpoint:** `GET /zone-area/zones-stats`  
**Auth:** Public

**Request:** Không có parameters

**Response:**
```json
{
  "success": true,
  "message": "Lấy thống kê zone thành công",
  "data": {
    "stats": {
      "total": 150,
      "active": 140,
      "inactive": 10,
      "newThisMonth": 5
    }
  }
}
```

