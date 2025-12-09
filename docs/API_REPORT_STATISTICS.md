# API Thống Kê Report

## 1. Thống Kê Dashboard Report

**Endpoint:** `GET /api/report/stats`

**Mô tả:** Lấy thống kê tổng quan về báo cáo cho dashboard.

**Authentication:** Cần (REPORT:READ permission)

**Response:**

```json
{
  "statusCode": 200,
  "message": "Lấy thống kê báo cáo thành công",
  "data": {
    "totalReports": 150,
    "reportsByStatus": {
      "OPEN": 20,
      "IN_PROGRESS": 15,
      "RESOLVED": 80,
      "CLOSED": 35
    },
    "reportsByType": {
      "ISSUE": 90,
      "MAINTENANCE": 40,
      "REQUEST": 20
    },
    "reportsByPriority": {
      "LOW": 30,
      "MEDIUM": 70,
      "HIGH": 35,
      "CRITICAL": 15
    },
    "recentReports": [
      {
        "_id": "...",
        "title": "...",
        "type": "ISSUE",
        "status": "OPEN",
        "priority": "HIGH",
        "createdAt": "2024-01-15T10:00:00.000Z",
        "asset": {
          "name": "...",
          "code": "..."
        },
        "createdBy": {
          "fullName": "..."
        }
      }
    ],
    "reportsThisMonth": 25,
    "reportsLastMonth": 20,
    "averageResolutionTime": 5
  }
}
```

**Giải thích các trường:**

- `totalReports`: Tổng số báo cáo trong hệ thống
- `reportsByStatus`: Số lượng báo cáo theo trạng thái (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
- `reportsByType`: Số lượng báo cáo theo loại (ISSUE, MAINTENANCE, REQUEST)
- `reportsByPriority`: Số lượng báo cáo theo độ ưu tiên (LOW, MEDIUM, HIGH, CRITICAL)
- `recentReports`: 5 báo cáo mới nhất
- `reportsThisMonth`: Số báo cáo được tạo trong tháng này
- `reportsLastMonth`: Số báo cáo được tạo trong tháng trước
- `averageResolutionTime`: Thời gian giải quyết trung bình (tính bằng ngày)

---

## 2. Thống Kê Dashboard Report (Alias)

**Endpoint:** `GET /api/report/statistics/dashboard`

**Mô tả:** Tương tự như `/api/report/stats`, đây là alias endpoint.

**Authentication:** Cần (REPORT:READ permission)

**Response:** Giống như endpoint `/api/report/stats`

---

## 3. Thống Kê Báo Cáo Theo Khoảng Thời Gian

**Endpoint:** `GET /api/automation/statistics`

**Mô tả:** Lấy báo cáo thống kê chi tiết cho một khoảng thời gian (tháng/quý/năm).

**Authentication:** Cần (REPORT:READ permission)

**Query Parameters:**

- `period` (optional): `'month' | 'quarter' | 'year'` (default: `'month'`)
- `startDate` (optional): Ngày bắt đầu (ISO string)
- `endDate` (optional): Ngày kết thúc (ISO string)

**Response:**

```json
{
  "statusCode": 200,
  "message": "Statistics report generated successfully",
  "data": {
    "period": "month",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T23:59:59.999Z",
    "reports": {
      "total": 25,
      "byStatus": {
        "PENDING": 5,
        "APPROVED": 10,
        "REJECTED": 2,
        "RESOLVED": 6,
        "CLOSED": 2
      },
      "byType": {
        "ISSUE": 15,
        "MAINTENANCE": 7,
        "REQUEST": 3
      },
      "byPriority": {
        "LOW": 5,
        "MEDIUM": 12,
        "HIGH": 6,
        "CRITICAL": 2
      },
      "resolved": 6,
      "pending": 5,
      "inProgress": 10
    },
    "audits": {
      "total": 30,
      "byStatus": {
        "PENDING": 10,
        "COMPLETED": 18,
        "OVERDUE": 2
      },
      "completed": 18,
      "pending": 10,
      "overdue": 2
    },
    "performance": {
      "averageResolutionTime": 48.5,
      "averageProcessingTime": 3.2,
      "resolutionRate": 75.5
    }
  }
}
```

**Giải thích các trường:**

- `period`: Khoảng thời gian (month/quarter/year)
- `startDate`: Ngày bắt đầu của khoảng thời gian
- `endDate`: Ngày kết thúc của khoảng thời gian
- `reports`: Thống kê về báo cáo
  - `total`: Tổng số báo cáo trong khoảng thời gian
  - `byStatus`: Số lượng theo trạng thái
  - `byType`: Số lượng theo loại
  - `byPriority`: Số lượng theo độ ưu tiên
  - `resolved`: Số báo cáo đã được giải quyết
  - `pending`: Số báo cáo đang chờ xử lý
  - `inProgress`: Số báo cáo đang xử lý
- `audits`: Thống kê về audit logs
  - `total`: Tổng số audit logs
  - `byStatus`: Số lượng theo trạng thái
  - `completed`: Số audit đã hoàn thành
  - `pending`: Số audit đang chờ
  - `overdue`: Số audit quá hạn
- `performance`: Chỉ số hiệu suất
  - `averageResolutionTime`: Thời gian giải quyết trung bình (giờ)
  - `averageProcessingTime`: Thời gian xử lý trung bình (ngày)
  - `resolutionRate`: Tỷ lệ giải quyết (%)

---

## 4. Thống Kê Time Series (Xu Hướng Theo Thời Gian)

**Endpoint:** `GET /api/report/statistics/time-series`

**Mô tả:** Lấy dữ liệu time series để vẽ biểu đồ đường (line chart) xu hướng theo thời gian.

**Authentication:** Cần (REPORT:READ permission)

**Query Parameters:**

- `type` (required): `'daily' | 'weekly' | 'monthly'` - Loại time series
- `startDate` (optional): Ngày bắt đầu (ISO string)
- `endDate` (optional): Ngày kết thúc (ISO string)
- `status` (optional): Lọc theo status cụ thể

**Response:**

```json
{
  "statusCode": 200,
  "message": "Lấy thống kê time series thành công",
  "data": [
    {
      "date": "2024-01-01",
      "total": 10,
      "byStatus": {
        "PENDING": 2,
        "APPROVED": 5,
        "RESOLVED": 3
      },
      "byType": {
        "ISSUE": 6,
        "MAINTENANCE": 3,
        "REQUEST": 1
      },
      "byPriority": {
        "LOW": 2,
        "MEDIUM": 5,
        "HIGH": 2,
        "CRITICAL": 1
      }
    }
  ]
}
```

**Lưu ý:** Nếu không truyền `startDate` và `endDate`, mặc định sẽ lấy:

- `daily`: 30 ngày gần nhất
- `weekly`: 12 tuần gần nhất
- `monthly`: 12 tháng gần nhất

---

## 5. Thống Kê Theo Vị Trí

**Endpoint:** `GET /api/report/statistics/by-location`

**Mô tả:** Lấy thống kê report theo campus/building/area/zone.

**Authentication:** Cần (REPORT:READ permission)

**Query Parameters:**

- `groupBy` (required): `'campus' | 'building' | 'area' | 'zone'` - Nhóm theo vị trí nào
- `startDate` (optional): Ngày bắt đầu (ISO string)
- `endDate` (optional): Ngày kết thúc (ISO string)

**Response:**

```json
{
  "statusCode": 200,
  "message": "Lấy thống kê theo zone thành công",
  "data": [
    {
      "locationId": "507f1f77bcf86cd799439011",
      "locationName": "Phòng A201",
      "total": 25,
      "byStatus": {
        "PENDING": 5,
        "APPROVED": 10,
        "RESOLVED": 8,
        "CLOSED": 2
      },
      "byType": {
        "ISSUE": 15,
        "MAINTENANCE": 7,
        "REQUEST": 3
      },
      "byPriority": {
        "LOW": 5,
        "MEDIUM": 12,
        "HIGH": 6,
        "CRITICAL": 2
      }
    }
  ]
}
```

**Lưu ý:** Kết quả được sắp xếp theo `total` giảm dần.

---

## 6. Top Assets Có Nhiều Report Nhất

**Endpoint:** `GET /api/report/statistics/top-assets`

**Mô tả:** Lấy danh sách assets có nhiều report nhất.

**Authentication:** Cần (REPORT:READ permission)

**Query Parameters:**

- `limit` (optional): Số lượng kết quả (default: 10)
- `startDate` (optional): Ngày bắt đầu (ISO string)
- `endDate` (optional): Ngày kết thúc (ISO string)

**Response:**

```json
{
  "statusCode": 200,
  "message": "Lấy top assets thành công",
  "data": [
    {
      "assetId": "507f1f77bcf86cd799439011",
      "assetName": "Máy lạnh A201",
      "assetCode": "AC-001",
      "totalReports": 15,
      "byStatus": {
        "PENDING": 2,
        "APPROVED": 5,
        "RESOLVED": 6,
        "CLOSED": 2
      },
      "byType": {
        "ISSUE": 10,
        "MAINTENANCE": 4,
        "REQUEST": 1
      }
    }
  ]
}
```

---

## 7. Top Reporters (Người Tạo Report Nhiều Nhất)

**Endpoint:** `GET /api/report/statistics/top-reporters`

**Mô tả:** Lấy danh sách người dùng tạo report nhiều nhất.

**Authentication:** Cần (REPORT:READ permission)

**Query Parameters:**

- `limit` (optional): Số lượng kết quả (default: 10)
- `startDate` (optional): Ngày bắt đầu (ISO string)
- `endDate` (optional): Ngày kết thúc (ISO string)

**Response:**

```json
{
  "statusCode": 200,
  "message": "Lấy top reporters thành công",
  "data": [
    {
      "userId": "507f1f77bcf86cd799439011",
      "userName": "Nguyễn Văn A",
      "userEmail": "a@example.com",
      "totalReports": 25,
      "byType": {
        "ISSUE": 15,
        "MAINTENANCE": 7,
        "REQUEST": 3
      }
    }
  ]
}
```

---
