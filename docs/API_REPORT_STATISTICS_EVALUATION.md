# Đánh Giá API Thống Kê Report

## 📊 Đánh Giá API Hiện Tại

### ✅ API Đã Có

1. **GET /api/report/stats** - Thống kê tổng quan
   - ✅ Tổng số báo cáo
   - ✅ Thống kê theo status, type, priority
   - ✅ 5 báo cáo gần đây
   - ✅ So sánh tháng này vs tháng trước
   - ✅ Thời gian giải quyết trung bình

2. **GET /api/automation/statistics** - Thống kê theo period
   - ✅ Thống kê theo month/quarter/year
   - ✅ Thống kê reports và audits
   - ✅ Chỉ số hiệu suất

### ❌ API Thiếu (Cần Bổ Sung)

#### 1. Time Series Data (Quan trọng nhất)

**Mục đích:** Vẽ biểu đồ đường (line chart) xu hướng theo thời gian

- ❌ Thống kê theo ngày (daily)
- ❌ Thống kê theo tuần (weekly)
- ❌ Thống kê theo tháng (monthly) - có nhưng chưa đủ chi tiết
- ❌ Xu hướng tăng/giảm

#### 2. Thống Kê Theo Vị Trí

**Mục đích:** Phân tích theo địa điểm

- ❌ Thống kê theo campus
- ❌ Thống kê theo building
- ❌ Thống kê theo area/zone

#### 3. Thống Kê Theo Asset

**Mục đích:** Tìm asset có nhiều vấn đề nhất

- ❌ Top assets có nhiều report nhất
- ❌ Thống kê theo asset category
- ❌ Thống kê theo asset type

#### 4. Thống Kê Theo Người Dùng

**Mục đích:** Phân tích người tạo báo cáo

- ❌ Top người tạo report nhiều nhất
- ❌ Thống kê theo role

#### 5. Thống Kê Chi Tiết Hơn

**Mục đích:** Phân tích sâu hơn

- ❌ Resolution time theo thời gian (trend)
- ❌ Thống kê theo khoảng thời gian tùy chỉnh (startDate, endDate)
- ❌ Thống kê resolution rate theo thời gian

---

## 🎯 Đề Xuất API Bổ Sung

### Priority 1: Time Series Data (Cao nhất)

#### API 1: Time Series Statistics

**Endpoint:** `GET /api/report/statistics/time-series`

**Mục đích:** Lấy dữ liệu time series để vẽ line chart xu hướng

**Query Parameters:**

- `type`: `'daily' | 'weekly' | 'monthly'` (required)
- `startDate`: ISO date string (optional)
- `endDate`: ISO date string (optional)
- `status`: Filter theo status (optional)

**Response:**

```json
{
  "data": [
    {
      "date": "2024-01-01",
      "total": 10,
      "byStatus": {
        "PENDING": 2,
        "APPROVED": 5,
        "RESOLVED": 3
      }
    },
    {
      "date": "2024-01-02",
      "total": 15,
      "byStatus": {...}
    }
  ]
}
```

---

### Priority 2: Thống Kê Theo Vị Trí

#### API 2: Statistics by Location

**Endpoint:** `GET /api/report/statistics/by-location`

**Mục đích:** Thống kê report theo campus/building/area

**Query Parameters:**

- `groupBy`: `'campus' | 'building' | 'area' | 'zone'` (required)
- `startDate`: ISO date string (optional)
- `endDate`: ISO date string (optional)

**Response:**

```json
{
  "data": [
    {
      "locationId": "...",
      "locationName": "Cơ sở 1",
      "total": 50,
      "byStatus": {...},
      "byType": {...},
      "byPriority": {...}
    }
  ]
}
```

---

### Priority 3: Top Assets/Users

#### API 3: Top Assets with Most Reports

**Endpoint:** `GET /api/report/statistics/top-assets`

**Mục đích:** Tìm assets có nhiều report nhất

**Query Parameters:**

- `limit`: number (default: 10)
- `startDate`: ISO date string (optional)
- `endDate`: ISO date string (optional)

**Response:**

```json
{
  "data": [
    {
      "assetId": "...",
      "assetName": "Máy lạnh A201",
      "assetCode": "AC-001",
      "totalReports": 15,
      "byStatus": {...},
      "byType": {...}
    }
  ]
}
```

#### API 4: Top Reporters

**Endpoint:** `GET /api/report/statistics/top-reporters`

**Mục đích:** Tìm người tạo report nhiều nhất

**Query Parameters:**

- `limit`: number (default: 10)
- `startDate`: ISO date string (optional)
- `endDate`: ISO date string (optional)

**Response:**

```json
{
  "data": [
    {
      "userId": "...",
      "userName": "Nguyễn Văn A",
      "userEmail": "a@example.com",
      "totalReports": 25,
      "byType": {...}
    }
  ]
}
```

---

### Priority 4: Thống Kê Chi Tiết

#### API 5: Statistics by Asset Category

**Endpoint:** `GET /api/report/statistics/by-asset-category`

**Mục đích:** Thống kê theo asset category

**Response:**

```json
{
  "data": [
    {
      "categoryId": "...",
      "categoryName": "Điều hòa",
      "total": 30,
      "byStatus": {...},
      "byType": {...}
    }
  ]
}
```

#### API 6: Resolution Time Trend

**Endpoint:** `GET /api/report/statistics/resolution-time-trend`

**Mục đích:** Xu hướng thời gian giải quyết theo thời gian

**Query Parameters:**

- `type`: `'daily' | 'weekly' | 'monthly'` (required)
- `startDate`: ISO date string (optional)
- `endDate`: ISO date string (optional)

**Response:**

```json
{
  "data": [
    {
      "date": "2024-01-01",
      "averageResolutionTime": 5.2,
      "minResolutionTime": 1,
      "maxResolutionTime": 10,
      "resolvedCount": 15
    }
  ]
}
```

---

## 📈 Biểu Đồ Có Thể Vẽ Với Các API

### Với API Hiện Tại:

- ✅ Pie Chart: Phân bố theo status/type/priority
- ✅ Bar Chart: So sánh tháng này vs tháng trước
- ✅ Card Stats: Tổng số, trung bình

### Với API Bổ Sung:

- ✅ Line Chart: Xu hướng theo thời gian (time series)
- ✅ Bar Chart: Thống kê theo location
- ✅ Bar Chart: Top assets/users
- ✅ Line Chart: Resolution time trend
- ✅ Stacked Bar Chart: So sánh nhiều metrics theo thời gian
- ✅ Heatmap: Thống kê theo location và thời gian

---

## 🎯 Kết Luận

**API hiện tại:** Đủ cho dashboard cơ bản (pie chart, bar chart đơn giản)

**Cần bổ sung:**

- ⚠️ **Quan trọng:** Time series API (để vẽ line chart xu hướng)
- ⚠️ **Quan trọng:** Statistics by location (phân tích theo địa điểm)
- ⚠️ **Hữu ích:** Top assets/users (tìm vấn đề nổi bật)
- ⚠️ **Hữu ích:** Resolution time trend (phân tích hiệu suất)

**Khuyến nghị:** Implement ít nhất 2 API đầu tiên (Time Series và By Location) để có đủ dữ liệu cho các biểu đồ thống kê phổ biến.
