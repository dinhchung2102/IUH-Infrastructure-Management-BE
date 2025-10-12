# Account Statistics API Documentation

## Mục lục

- [Tổng quan](#tổng-quan)
- [Authentication](#authentication)
- [Endpoint](#endpoint)
- [Request Parameters](#request-parameters)
- [Response Structure](#response-structure)
- [Use Cases](#use-cases)
- [Examples](#examples)

---

## Tổng quan

API Account Statistics cung cấp các thống kê chi tiết về tài khoản trong hệ thống, bao gồm:

- Tổng số tài khoản và trạng thái
- Thống kê theo vai trò (role)
- Thống kê theo chuỗi thời gian (time series)

---

## Authentication

**Required**: Yes  
**Permission**: `ACCOUNT:ADMINACTION`  
**Headers**:

```
Authorization: Bearer <access_token>
```

---

## Endpoint

```
GET /api/auth/accounts/stats
```

---

## Request Parameters

### Query Parameters

| Parameter   | Type              | Required | Description                         | Example                                      |
| ----------- | ----------------- | -------- | ----------------------------------- | -------------------------------------------- |
| `type`      | string            | No       | Loại thống kê time series           | `date`, `month`, `quarter`, `year`, `custom` |
| `startDate` | string (ISO 8601) | No\*     | Ngày bắt đầu (chỉ với type=custom)  | `2025-01-01`                                 |
| `endDate`   | string (ISO 8601) | No\*     | Ngày kết thúc (chỉ với type=custom) | `2025-12-31`                                 |

**Note**: `startDate` và `endDate` chỉ bắt buộc khi `type=custom`

### Type Values

| Value     | Description         | Time Range                  |
| --------- | ------------------- | --------------------------- |
| `date`    | Thống kê theo ngày  | 12 ngày gần nhất            |
| `month`   | Thống kê theo tháng | 12 tháng trong năm hiện tại |
| `quarter` | Thống kê theo quý   | 4 quý trong năm hiện tại    |
| `year`    | Thống kê theo năm   | 3 năm gần nhất              |
| `custom`  | Thống kê tùy chỉnh  | Từ startDate đến endDate    |

---

## Response Structure

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Lấy thống kê tài khoản thành công",
  "data": {
    "totalAccounts": number,
    "activeAccounts": number,
    "inactiveAccounts": number,
    "newAccountsThisMonth": number,
    "timeSeries": [...],  // Optional, chỉ có khi truyền type
    "accountsByRole": [...]
  },
  "timestamp": "2025-10-12T05:29:12.402Z",
  "path": "/api/auth/accounts/stats"
}
```

### Response Fields

#### Basic Statistics (Luôn có)

| Field                  | Type   | Description                                   |
| ---------------------- | ------ | --------------------------------------------- |
| `totalAccounts`        | number | Tổng số tài khoản trong hệ thống              |
| `activeAccounts`       | number | Số tài khoản đang hoạt động (isActive=true)   |
| `inactiveAccounts`     | number | Số tài khoản không hoạt động (isActive=false) |
| `newAccountsThisMonth` | number | Số tài khoản mới tạo trong tháng hiện tại     |

#### Role Statistics (Luôn có)

```typescript
accountsByRole: Array<{
  role: string; // Tên role (ADMIN, STUDENT, CAMPUS_ADMIN, etc.)
  count: number; // Số lượng tài khoản có role này
}>;
```

#### Time Series (Optional - khi có query param `type`)

```typescript
timeSeries: Array<{
  period: string; // Nhãn thời gian (format khác nhau theo type)
  totalAccounts: number; // Tổng số tài khoản được tạo trong period
  activeAccounts: number; // Số tài khoản active được tạo trong period
  inactiveAccounts: number; // Số tài khoản inactive được tạo trong period
}>;
```

**Period Format theo Type:**

- `date`: `YYYY-MM-DD` (vd: `2025-10-12`)
- `month`: `YYYY-MM` (vd: `2025-10`)
- `quarter`: `YYYY-QN` (vd: `2025-Q3`)
- `year`: `YYYY` (vd: `2025`)
- `custom`: `YYYY-MM-DD`

---

## Use Cases

### 1. Lấy thống kê tổng quan

**Mục đích**: Hiển thị dashboard tổng quan hệ thống

**Request**:

```
GET /api/auth/accounts/stats
```

**Response**:

```json
{
  "success": true,
  "message": "Lấy thống kê tài khoản thành công",
  "data": {
    "totalAccounts": 1540,
    "activeAccounts": 1420,
    "inactiveAccounts": 120,
    "newAccountsThisMonth": 85,
    "accountsByRole": [
      { "role": "STUDENT", "count": 1510 },
      { "role": "CAMPUS_ADMIN", "count": 25 },
      { "role": "ADMIN", "count": 5 }
    ]
  }
}
```

---

### 2. Thống kê theo ngày (Chart 12 ngày)

**Mục đích**: Biểu đồ xu hướng đăng ký theo ngày

**Request**:

```
GET /api/auth/accounts/stats?type=date
```

**Response**:

```json
{
  "data": {
    "totalAccounts": 1540,
    "activeAccounts": 1420,
    "inactiveAccounts": 120,
    "newAccountsThisMonth": 85,
    "timeSeries": [
      {
        "period": "2025-10-01",
        "totalAccounts": 8,
        "activeAccounts": 7,
        "inactiveAccounts": 1
      },
      {
        "period": "2025-10-02",
        "totalAccounts": 12,
        "activeAccounts": 11,
        "inactiveAccounts": 1
      },
      ...
      {
        "period": "2025-10-12",
        "totalAccounts": 10,
        "activeAccounts": 9,
        "inactiveAccounts": 1
      }
    ],
    "accountsByRole": [...]
  }
}
```

**Use case**:

- Line chart hiển thị số lượng đăng ký mới mỗi ngày
- Phát hiện ngày có lượng đăng ký bất thường

---

### 3. Thống kê theo tháng (Chart 12 tháng)

**Mục đích**: Biểu đồ xu hướng trong năm

**Request**:

```
GET /api/auth/accounts/stats?type=month
```

**Response**:

```json
{
  "data": {
    "totalAccounts": 1540,
    "timeSeries": [
      {
        "period": "2025-01",
        "totalAccounts": 120,
        "activeAccounts": 110,
        "inactiveAccounts": 10
      },
      {
        "period": "2025-02",
        "totalAccounts": 135,
        "activeAccounts": 125,
        "inactiveAccounts": 10
      },
      ...
      {
        "period": "2025-10",
        "totalAccounts": 85,
        "activeAccounts": 80,
        "inactiveAccounts": 5
      }
    ],
    "accountsByRole": [...]
  }
}
```

**Use case**:

- Bar chart hiển thị xu hướng đăng ký theo tháng
- So sánh hiệu quả các tháng trong năm
- Lập kế hoạch marketing

---

### 4. Thống kê theo quý (Chart 4 quý)

**Mục đích**: Phân tích theo quý

**Request**:

```
GET /api/auth/accounts/stats?type=quarter
```

**Response**:

```json
{
  "data": {
    "totalAccounts": 1540,
    "timeSeries": [
      {
        "period": "2025-Q1",
        "totalAccounts": 380,
        "activeAccounts": 350,
        "inactiveAccounts": 30
      },
      {
        "period": "2025-Q2",
        "totalAccounts": 420,
        "activeAccounts": 390,
        "inactiveAccounts": 30
      },
      {
        "period": "2025-Q3",
        "totalAccounts": 455,
        "activeAccounts": 425,
        "inactiveAccounts": 30
      },
      {
        "period": "2025-Q4",
        "totalAccounts": 285,
        "activeAccounts": 255,
        "inactiveAccounts": 30
      }
    ],
    "accountsByRole": [...]
  }
}
```

**Use case**:

- Báo cáo quarterly cho ban lãnh đạo
- KPI tracking theo quý

---

### 5. Thống kê theo năm (Chart 3 năm)

**Mục đích**: So sánh tăng trưởng qua các năm

**Request**:

```
GET /api/auth/accounts/stats?type=year
```

**Response**:

```json
{
  "data": {
    "totalAccounts": 1540,
    "timeSeries": [
      {
        "period": "2023",
        "totalAccounts": 500,
        "activeAccounts": 450,
        "inactiveAccounts": 50
      },
      {
        "period": "2024",
        "totalAccounts": 800,
        "activeAccounts": 720,
        "inactiveAccounts": 80
      },
      {
        "period": "2025",
        "totalAccounts": 240,
        "activeAccounts": 220,
        "inactiveAccounts": 20
      }
    ],
    "accountsByRole": [...]
  }
}
```

**Use case**:

- Báo cáo tổng kết năm
- Đánh giá tăng trưởng year-over-year

---

### 6. Thống kê custom theo khoảng thời gian

**Mục đích**: Phân tích theo campaign cụ thể

**Request**:

```
GET /api/auth/accounts/stats?type=custom&startDate=2025-08-01&endDate=2025-08-31
```

**Response**:

```json
{
  "data": {
    "totalAccounts": 1540,
    "timeSeries": [
      {
        "period": "2025-08-01",
        "totalAccounts": 15,
        "activeAccounts": 14,
        "inactiveAccounts": 1
      },
      {
        "period": "2025-08-02",
        "totalAccounts": 18,
        "activeAccounts": 17,
        "inactiveAccounts": 1
      },
      ...
      {
        "period": "2025-08-31",
        "totalAccounts": 12,
        "activeAccounts": 11,
        "inactiveAccounts": 1
      }
    ],
    "accountsByRole": [...]
  }
}
```

**Use case**:

- Đánh giá hiệu quả campaign marketing trong khoảng thời gian cụ thể
- Phân tích sự kiện đặc biệt (khai giảng, tuyển sinh, etc.)

---

## Examples

### Frontend Integration

#### React Example (với Recharts)

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useEffect, useState } from 'react';

interface StatsData {
  totalAccounts: number;
  activeAccounts: number;
  inactiveAccounts: number;
  newAccountsThisMonth: number;
  timeSeries?: Array<{
    period: string;
    totalAccounts: number;
    activeAccounts: number;
    inactiveAccounts: number;
  }>;
  accountsByRole: Array<{
    role: string;
    count: number;
  }>;
}

function AccountStatsChart() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [timeType, setTimeType] = useState<'date' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    fetchStats(timeType);
  }, [timeType]);

  const fetchStats = async (type: string) => {
    const response = await fetch(`/api/auth/accounts/stats?type=${type}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const result = await response.json();
    setStats(result.data);
  };

  return (
    <div>
      {/* Overview Cards */}
      <div className="stats-cards">
        <div className="card">
          <h3>Total Accounts</h3>
          <p>{stats?.totalAccounts}</p>
        </div>
        <div className="card">
          <h3>Active</h3>
          <p>{stats?.activeAccounts}</p>
        </div>
        <div className="card">
          <h3>Inactive</h3>
          <p>{stats?.inactiveAccounts}</p>
        </div>
        <div className="card">
          <h3>New This Month</h3>
          <p>{stats?.newAccountsThisMonth}</p>
        </div>
      </div>

      {/* Time Series Chart */}
      {stats?.timeSeries && (
        <LineChart width={800} height={400} data={stats.timeSeries}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="totalAccounts" stroke="#8884d8" />
          <Line type="monotone" dataKey="activeAccounts" stroke="#82ca9d" />
          <Line type="monotone" dataKey="inactiveAccounts" stroke="#ffc658" />
        </LineChart>
      )}

      {/* Role Distribution Pie Chart */}
      {/* ... */}
    </div>
  );
}
```

#### Axios Example

```typescript
import axios from 'axios';

// Get overview stats only
const getOverviewStats = async () => {
  const response = await axios.get('/api/auth/accounts/stats', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.data;
};

// Get monthly stats
const getMonthlyStats = async () => {
  const response = await axios.get('/api/auth/accounts/stats', {
    params: { type: 'month' },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.data;
};

// Get custom range stats
const getCustomStats = async (startDate: string, endDate: string) => {
  const response = await axios.get('/api/auth/accounts/stats', {
    params: {
      type: 'custom',
      startDate,
      endDate,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.data;
};
```

---

## Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized",
  "timestamp": "2025-10-12T05:29:12.402Z",
  "path": "/api/auth/accounts/stats"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "Forbidden: Insufficient permissions",
  "timestamp": "2025-10-12T05:29:12.402Z",
  "path": "/api/auth/accounts/stats"
}
```

### 400 Bad Request (Invalid type)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "type",
      "message": "Type phải là một trong các giá trị: date, month, quarter, year, custom"
    }
  ],
  "timestamp": "2025-10-12T05:29:12.402Z",
  "path": "/api/auth/accounts/stats"
}
```

### 400 Bad Request (Missing dates for custom type)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "startDate",
      "message": "startDate phải có định dạng ISO 8601 (YYYY-MM-DD)"
    }
  ],
  "timestamp": "2025-10-12T05:29:12.402Z",
  "path": "/api/auth/accounts/stats"
}
```

---

## Performance Notes

- API sử dụng MongoDB Aggregation Pipeline để tối ưu performance
- Kết quả được tính toán real-time, không cache
- Response time trung bình: < 500ms với database size < 100K records
- Recommended: Implement client-side caching với TTL 5-10 phút cho dashboard

---

## Changelog

### Version 1.0.0 (2025-10-12)

- Initial release
- Support thống kê tổng quan
- Support time series theo date, month, quarter, year, custom
- Support thống kê theo role

---

## Related Documentation

- [Authentication API](./LOGIN_AND_TOKEN_LOGIC.md)
- [Account Management API](./ACCOUNT_MANAGEMENT_API.md)
- [Permissions Guide](./PERMISSIONS_GUIDE.md)
