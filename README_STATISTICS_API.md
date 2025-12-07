# API Thống Kê (Statistics)

## Tổng Quan

Module thống kê cung cấp các API để phân tích và báo cáo dữ liệu trong hệ thống quản lý cơ sở hạ tầng.

---

## 1. Thống Kê Số Lượng Báo Cáo Theo Thời Gian (Biểu Đồ Cột)

**Endpoint:** `GET /api/statistics/reports/by-period`

**Headers:**

```
Authorization: Bearer {token}
```

**Query Parameters:**

- `period` (enum, optional): `week` | `month` | `year` (default: `month`)
- `startDate` (string, optional): Ngày bắt đầu (ISO 8601)
- `endDate` (string, optional): Ngày kết thúc (ISO 8601)

**Response Success (200):**

```json
{
  "success": true,
  "message": "Lấy thống kê báo cáo theo thời gian thành công",
  "data": {
    "period": "month",
    "chartData": [
      {
        "period": "2025-01",
        "count": 15
      },
      {
        "period": "2025-02",
        "count": 23
      }
    ],
    "total": 38
  }
}
```

**Ví dụ:**

```
GET /api/statistics/reports/by-period?period=month&startDate=2025-01-01&endDate=2025-12-31
```

---

## 2. Phân Loại Các Loại Báo Cáo (Biểu Đồ Tròn)

**Endpoint:** `GET /api/statistics/reports/by-type`

**Headers:**

```
Authorization: Bearer {token}
```

**Response Success (200):**

```json
{
  "success": true,
  "message": "Lấy thống kê báo cáo theo loại thành công",
  "data": {
    "chartData": [
      {
        "type": "DAMAGED",
        "label": "Hỏng hóc",
        "count": 45,
        "percentage": 35.2
      },
      {
        "type": "MAINTENANCE",
        "label": "Bảo trì",
        "count": 30,
        "percentage": 23.4
      },
      {
        "type": "BUY_NEW",
        "label": "Mua mới",
        "count": 25,
        "percentage": 19.5
      },
      {
        "type": "LOST",
        "label": "Thất lạc",
        "count": 20,
        "percentage": 15.6
      },
      {
        "type": "OTHER",
        "label": "Khác",
        "count": 8,
        "percentage": 6.3
      }
    ],
    "total": 128
  }
}
```

---

## 3. Thống Kê Nhiệm Vụ Theo Nhân Viên (Tỉ Lệ Hoàn Thành)

**Endpoint:** `GET /api/statistics/audits/by-staff`

**Headers:**

```
Authorization: Bearer {token}
```

**Response Success (200):**

```json
{
  "success": true,
  "message": "Lấy thống kê nhiệm vụ theo nhân viên thành công",
  "data": [
    {
      "staffId": "6933b07974bfc2f0e8426f1b",
      "staffName": "Nguyễn Văn A",
      "staffEmail": "nguyenvana@iuh.edu.vn",
      "total": 25,
      "completed": 20,
      "inProgress": 3,
      "pending": 2,
      "completionRate": 80.0
    },
    {
      "staffId": "6933b07974bfc2f0e8426f1c",
      "staffName": "Trần Thị B",
      "staffEmail": "tranthib@iuh.edu.vn",
      "total": 18,
      "completed": 15,
      "inProgress": 2,
      "pending": 1,
      "completionRate": 83.3
    }
  ]
}
```

---

## 4. Thống Kê Tổng Hợp (Dashboard Stats)

**Endpoint:** `GET /api/statistics/overall`

**Headers:**

```
Authorization: Bearer {token}
```

**Response Success (200):**

```json
{
  "success": true,
  "message": "Lấy thống kê tổng hợp thành công",
  "data": {
    "totalReports": 128,
    "totalAssets": 450,
    "totalAuditLogs": 85,
    "completedAuditLogs": 65,
    "completionRate": 76.5,
    "resolutionRate": 45.3
  }
}
```

**Giải thích:**

- `totalReports`: Tổng số báo cáo
- `totalAssets`: Tổng số thiết bị
- `totalAuditLogs`: Tổng số nhiệm vụ đã giao
- `completedAuditLogs`: Số nhiệm vụ đã hoàn thành
- `completionRate`: Tỷ lệ hoàn thành nhiệm vụ (%)
- `resolutionRate`: Tỷ lệ xử lý sự cố (báo cáo đã được phê duyệt) (%)

---

## 5. Phân Bố Số Lượng Thiết Bị Theo Cơ Sở

**Endpoint:** `GET /api/statistics/assets/by-campus`

**Headers:**

```
Authorization: Bearer {token}
```

**Response Success (200):**

```json
{
  "success": true,
  "message": "Lấy phân bố thiết bị theo cơ sở thành công",
  "data": {
    "chartData": [
      {
        "campus": "Cơ sở Nguyễn Văn Bảo",
        "count": 280
      },
      {
        "campus": "Cơ sở Hóc Môn",
        "count": 150
      },
      {
        "campus": "Chưa phân loại",
        "count": 20
      }
    ],
    "total": 450
  }
}
```

---

## 6. Thống Kê Khu Vực Có Nhiều Báo Cáo Sự Cố

**Endpoint:** `GET /api/statistics/reports/by-location/:type`

**Headers:**

```
Authorization: Bearer {token}
```

**Path Parameters:**

- `type` (enum, required): `area` | `building` | `zone`

**Response Success (200):**

```json
{
  "success": true,
  "message": "Lấy thống kê báo cáo theo zone thành công",
  "data": {
    "type": "zone",
    "chartData": [
      {
        "locationId": "6933b07974bfc2f0e8426f1b",
        "location": "Phòng A.201",
        "count": 15
      },
      {
        "locationId": "6933b07974bfc2f0e8426f1c",
        "location": "Phòng A.202",
        "count": 12
      },
      {
        "locationId": "6933b07974bfc2f0e8426f1d",
        "location": "Phòng B.101",
        "count": 10
      }
    ],
    "total": 37
  }
}
```

**Ví dụ:**

```
GET /api/statistics/reports/by-location/zone
GET /api/statistics/reports/by-location/area
GET /api/statistics/reports/by-location/building
```

---

## Permissions

Tất cả các endpoint yêu cầu authentication và permissions:

- **Reports Statistics:**
  - `REPORT:READ`

- **Audit Statistics:**
  - `AUDIT:READ`

- **Asset Statistics:**
  - `ASSET:READ`

- **Overall Statistics:**
  - `REPORT:READ` OR `ASSET:READ` OR `AUDIT:READ`

---

## Lưu Ý

1. **Time Period:**
   - `week`: Nhóm theo tuần (YYYY-WW)
   - `month`: Nhóm theo tháng (YYYY-MM)
   - `year`: Nhóm theo năm (YYYY)

2. **Location Type:**
   - `zone`: Thống kê theo khu vực (zone)
   - `area`: Thống kê theo vùng (area)
   - `building`: Thống kê theo tòa nhà (building)

3. **Top Results:**
   - Endpoint `reports/by-location` chỉ trả về top 10 khu vực có nhiều báo cáo nhất

4. **Data Format:**
   - Tất cả các biểu đồ đều trả về dữ liệu dạng array để dễ dàng render chart
   - Percentages được làm tròn đến 1 chữ số thập phân

---
