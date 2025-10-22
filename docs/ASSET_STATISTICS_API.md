# Asset Statistics API Documentation

## Tổng quan

Hệ thống cung cấp 5 API thống kê chi tiết cho tài sản (Assets), giúp quản lý và theo dõi tình trạng tài sản một cách toàn diện.

## Các API Statistics

### 1. Dashboard Statistics

**Endpoint:** `GET /assets/statistics/dashboard`

**Mô tả:** API tổng hợp thống kê tổng quan về tất cả tài sản trong hệ thống, bao gồm số lượng, phân bố theo trạng thái, loại, vị trí, campus, và các chỉ số quan trọng khác.

**Yêu cầu authentication:** Có (cần quyền `ASSET:READ`)

**Response structure:**

```json
{
  "message": "Lấy thống kê tài sản thành công",
  "data": {
    "totalAssets": 150,
    "assetsByStatus": {
      "NEW": 20,
      "IN_USE": 100,
      "UNDER_MAINTENANCE": 15,
      "DAMAGED": 10,
      "LOST": 2,
      "DISPOSED": 1,
      "TRANSFERRED": 2
    },
    "assetsByCategory": [
      {
        "_id": "category_id",
        "name": "Thiết bị điện tử",
        "count": 50,
        "inUse": 40,
        "underMaintenance": 5,
        "damaged": 5
      }
    ],
    "assetsByType": [
      {
        "_id": "type_id",
        "name": "Máy tính",
        "count": 30,
        "inUse": 25,
        "underMaintenance": 3
      }
    ],
    "assetsByLocation": {
      "zones": 120,
      "areas": 30
    },
    "assetsByCampus": [
      {
        "name": "Cơ sở A",
        "count": 80,
        "inUse": 65
      }
    ],
    "assetsThisMonth": 10,
    "assetsLastMonth": 8,
    "growthRate": 25.0,
    "warrantyExpiringSoon": 5,
    "warrantyExpired": 15,
    "maintenanceOverdue": 12,
    "averageAssetAge": 18.5
  }
}
```

**Các chỉ số thống kê:**

- `totalAssets`: Tổng số tài sản
- `assetsByStatus`: Phân bố theo trạng thái (7 trạng thái)
- `assetsByCategory`: Phân bố theo loại tài sản với chi tiết trạng thái
- `assetsByType`: Top 10 kiểu tài sản phổ biến nhất
- `assetsByLocation`: Số lượng tài sản theo zones và areas
- `assetsByCampus`: Phân bố theo campus với số lượng đang sử dụng
- `assetsThisMonth`: Số tài sản được tạo trong tháng này
- `assetsLastMonth`: Số tài sản được tạo trong tháng trước
- `growthRate`: Tỷ lệ tăng trưởng so với tháng trước (%)
- `warrantyExpiringSoon`: Số tài sản hết bảo hành trong 30 ngày tới
- `warrantyExpired`: Số tài sản đã hết bảo hành
- `maintenanceOverdue`: Số tài sản cần bảo trì (chưa bảo trì trong 6 tháng)
- `averageAssetAge`: Tuổi trung bình của tài sản (tháng)

---

### 2. Category Statistics

**Endpoint:** `GET /assets/statistics/categories`

**Mô tả:** API thống kê chi tiết theo từng loại tài sản (Asset Category), bao gồm phân bố trạng thái của tất cả các tài sản trong từng loại.

**Yêu cầu authentication:** Có (cần quyền `ASSET:READ`)

**Response structure:**

```json
{
  "message": "Lấy thống kê theo loại tài sản thành công",
  "data": [
    {
      "_id": "category_id",
      "name": "Thiết bị điện tử",
      "image": "url_to_image",
      "totalAssets": 50,
      "new": 5,
      "inUse": 35,
      "underMaintenance": 5,
      "damaged": 3,
      "lost": 1,
      "disposed": 0,
      "transferred": 1
    }
  ]
}
```

**Các thông tin thống kê:**

- `_id`: ID của category
- `name`: Tên loại tài sản
- `image`: Hình ảnh đại diện
- `totalAssets`: Tổng số tài sản
- `new`: Số tài sản mới
- `inUse`: Số tài sản đang sử dụng
- `underMaintenance`: Số tài sản đang bảo trì
- `damaged`: Số tài sản hỏng
- `lost`: Số tài sản mất
- `disposed`: Số tài sản đã thanh lý
- `transferred`: Số tài sản đã chuyển giao

**Sắp xếp:** Theo tổng số tài sản (giảm dần)

---

### 3. Type Statistics

**Endpoint:** `GET /assets/statistics/types?categoryId={categoryId}`

**Mô tả:** API thống kê chi tiết theo kiểu tài sản (Asset Type), có thể lọc theo category ID.

**Yêu cầu authentication:** Có (cần quyền `ASSET:READ`)

**Query Parameters:**

- `categoryId` (optional): ID của category để lọc

**Response structure:**

```json
{
  "message": "Lấy thống kê theo kiểu tài sản thành công",
  "data": [
    {
      "_id": "type_id",
      "name": "Máy tính Dell",
      "categoryName": "Thiết bị điện tử",
      "totalAssets": 30,
      "new": 3,
      "inUse": 22,
      "underMaintenance": 3,
      "damaged": 2,
      "lost": 0,
      "disposed": 0,
      "transferred": 0
    }
  ]
}
```

**Các thông tin thống kê:**

- `_id`: ID của type
- `name`: Tên kiểu tài sản
- `categoryName`: Tên loại tài sản (category)
- `totalAssets`: Tổng số tài sản
- Các trạng thái: new, inUse, underMaintenance, damaged, lost, disposed, transferred

**Sắp xếp:** Theo tổng số tài sản (giảm dần)

---

### 4. Location Statistics

**Endpoint:** `GET /assets/statistics/locations`

**Mô tả:** API thống kê chi tiết theo địa điểm (zones và areas), bao gồm thông tin về campus và building.

**Yêu cầu authentication:** Có (cần quyền `ASSET:READ`)

**Response structure:**

```json
{
  "message": "Lấy thống kê theo địa điểm thành công",
  "data": {
    "byZones": [
      {
        "_id": "zone_id",
        "zoneName": "Phòng A101",
        "buildingName": "Tòa nhà A",
        "campusName": "Cơ sở A",
        "totalAssets": 25,
        "inUse": 20,
        "underMaintenance": 3,
        "damaged": 2
      }
    ],
    "byAreas": [
      {
        "_id": "area_id",
        "areaName": "Khu vực sân vườn",
        "campusName": "Cơ sở A",
        "totalAssets": 15,
        "inUse": 12,
        "underMaintenance": 2,
        "damaged": 1
      }
    ]
  }
}
```

**Các thông tin thống kê:**

**Theo Zones:**

- `_id`: ID của zone
- `zoneName`: Tên zone
- `buildingName`: Tên tòa nhà
- `campusName`: Tên campus
- `totalAssets`: Tổng số tài sản
- `inUse`: Số tài sản đang sử dụng
- `underMaintenance`: Số tài sản đang bảo trì
- `damaged`: Số tài sản hỏng

**Theo Areas:**

- `_id`: ID của area
- `areaName`: Tên area
- `campusName`: Tên campus
- `totalAssets`: Tổng số tài sản
- Các trạng thái: inUse, underMaintenance, damaged

**Sắp xếp:** Theo tổng số tài sản (giảm dần)

---

### 5. Maintenance & Warranty Statistics

**Endpoint:** `GET /assets/statistics/maintenance-warranty`

**Mô tả:** API thống kê chi tiết về bảo trì và bảo hành của tài sản, giúp theo dõi các tài sản cần chú ý.

**Yêu cầu authentication:** Có (cần quyền `ASSET:READ`)

**Response structure:**

```json
{
  "message": "Lấy thống kê bảo trì và bảo hành thành công",
  "data": {
    "warrantyExpiring": 5,
    "warrantyExpired": 15,
    "maintenanceOverdue": 12,
    "recentlyMaintained": 8,
    "neverMaintained": 25
  }
}
```

**Các thông tin thống kê:**

- `warrantyExpiring`: Số lượng tài sản hết bảo hành trong 30 ngày tới
- `warrantyExpired`: Số lượng tài sản đã hết bảo hành (không bao gồm DISPOSED, LOST)
- `maintenanceOverdue`: Số lượng tài sản cần bảo trì (chưa bảo trì trong 6 tháng)
- `recentlyMaintained`: Số lượng tài sản được bảo trì gần đây (trong 30 ngày qua)
- `neverMaintained`: Số lượng tài sản chưa bao giờ được bảo trì

**Lưu ý:**

- Không thống kê các tài sản có trạng thái: DISPOSED, LOST, NEW (đối với maintenance overdue và never maintained)
- Tài sản cần bảo trì: không được bảo trì trong 6 tháng qua
- Tất cả các trường chỉ trả về số lượng (number), không trả về danh sách thiết bị cụ thể

---

## Các trạng thái tài sản (Asset Status)

Hệ thống hỗ trợ 7 trạng thái tài sản:

1. **NEW**: Tài sản mới (chưa sử dụng)
2. **IN_USE**: Đang sử dụng
3. **UNDER_MAINTENANCE**: Đang bảo trì
4. **DAMAGED**: Hỏng hóc
5. **LOST**: Mất
6. **DISPOSED**: Đã thanh lý
7. **TRANSFERRED**: Đã chuyển giao

---

## Quyền truy cập

Tất cả các API statistics yêu cầu:

- Authentication: Bearer token
- Permission: `ASSET:READ`

---

## Best Practices

1. **Dashboard Statistics**: Sử dụng cho trang tổng quan, cập nhật mỗi 5-10 phút
2. **Category Statistics**: Hiển thị biểu đồ phân bố tài sản theo loại
3. **Type Statistics**: Dùng cho báo cáo chi tiết, có thể lọc theo category
4. **Location Statistics**: Quản lý phân bố tài sản theo địa điểm
5. **Maintenance & Warranty**: Cảnh báo và lập kế hoạch bảo trì/bảo hành

---

## Ví dụ sử dụng

### Lấy thống kê tổng quan

```bash
curl -X GET "http://localhost:3000/assets/statistics/dashboard" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Lấy thống kê theo category

```bash
curl -X GET "http://localhost:3000/assets/statistics/categories" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Lấy thống kê theo type của một category

```bash
curl -X GET "http://localhost:3000/assets/statistics/types?categoryId=abc123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Lấy thống kê theo địa điểm

```bash
curl -X GET "http://localhost:3000/assets/statistics/locations" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Lấy thống kê bảo trì và bảo hành

```bash
curl -X GET "http://localhost:3000/assets/statistics/maintenance-warranty" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
