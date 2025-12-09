# API Thống Kê Building và Area

## 📋 Tổng Quan

Các API này cung cấp thống kê về số lượng tòa nhà (Building) và khu vực (Area) theo các trạng thái khác nhau. Có 4 API chính:

1. **Thống kê tòa nhà tổng thể** - Lấy thống kê tất cả tòa nhà trong hệ thống
2. **Thống kê khu vực tổng thể** - Lấy thống kê tất cả khu vực trong hệ thống
3. **Thống kê tòa nhà theo campus** - Lấy thống kê tòa nhà của một campus cụ thể
4. **Thống kê khu vực theo campus** - Lấy thống kê khu vực của một campus cụ thể

## 🔗 Endpoints

### 1. Thống Kê Tòa Nhà (Building Statistics)

**Endpoint:** `GET /api/zone-area/buildings-stats`

**Mô tả:** Lấy thống kê về số lượng tòa nhà theo các trạng thái.

**Authentication:** Không cần (Public endpoint)

**Response:**

```json
{
  "statusCode": 200,
  "message": "Lấy thống kê tòa nhà thành công",
  "data": {
    "total": 50,
    "active": 35,
    "inactive": 10,
    "underMaintenance": 5
  }
}
```

**Giải thích các trường:**

- `total`: Tổng số tòa nhà trong hệ thống
- `active`: Số tòa nhà đang hoạt động (status = `ACTIVE`)
- `inactive`: Số tòa nhà ngừng hoạt động (status = `INACTIVE`)
- `underMaintenance`: Số tòa nhà đang bảo trì (status = `UNDERMAINTENANCE`)

---

### 2. Thống Kê Khu Vực (Area Statistics)

**Endpoint:** `GET /api/zone-area/areas-stats`

**Mô tả:** Lấy thống kê về số lượng khu vực theo các trạng thái.

**Authentication:** Không cần (Public endpoint)

**Response:**

```json
{
  "statusCode": 200,
  "message": "Lấy thống kê khu vực thành công",
  "data": {
    "total": 30,
    "active": 25,
    "inactive": 3,
    "underMaintenance": 2
  }
}
```

**Giải thích các trường:**

- `total`: Tổng số khu vực trong hệ thống
- `active`: Số khu vực đang hoạt động (status = `ACTIVE`)
- `inactive`: Số khu vực ngừng hoạt động (status = `INACTIVE`)
- `underMaintenance`: Số khu vực đang bảo trì (status = `UNDERMAINTENANCE`)

---

### 3. Thống Kê Tòa Nhà Theo Campus (Building Statistics by Campus)

**Endpoint:** `GET /api/zone-area/buildings-stats-by-campus`

**Mô tả:** Lấy thống kê về số lượng tòa nhà của tất cả các campus theo các trạng thái.

**Authentication:** Không cần (Public endpoint)

**Response:**

```json
{
  "statusCode": 200,
  "message": "Lấy thống kê tòa nhà theo campus thành công",
  "data": [
    {
      "campusId": "507f1f77bcf86cd799439011",
      "campusName": "Cơ sở 1 - Quận 12",
      "total": 20,
      "active": 15,
      "inactive": 3,
      "underMaintenance": 2
    },
    {
      "campusId": "507f1f77bcf86cd799439012",
      "campusName": "Cơ sở 2 - Quận 7",
      "total": 15,
      "active": 12,
      "inactive": 2,
      "underMaintenance": 1
    }
  ]
}
```

**Giải thích các trường:**

- `data`: Mảng các object, mỗi object chứa:
  - `campusId`: ID của campus
  - `campusName`: Tên của campus
  - `total`: Tổng số tòa nhà trong campus
  - `active`: Số tòa nhà đang hoạt động (status = `ACTIVE`)
  - `inactive`: Số tòa nhà ngừng hoạt động (status = `INACTIVE`)
  - `underMaintenance`: Số tòa nhà đang bảo trì (status = `UNDERMAINTENANCE`)

---

### 4. Thống Kê Khu Vực Theo Campus (Area Statistics by Campus)

**Endpoint:** `GET /api/zone-area/areas-stats-by-campus`

**Mô tả:** Lấy thống kê về số lượng khu vực của tất cả các campus theo các trạng thái.

**Authentication:** Không cần (Public endpoint)

**Response:**

```json
{
  "statusCode": 200,
  "message": "Lấy thống kê khu vực theo campus thành công",
  "data": [
    {
      "campusId": "507f1f77bcf86cd799439011",
      "campusName": "Cơ sở 1 - Quận 12",
      "total": 15,
      "active": 12,
      "inactive": 2,
      "underMaintenance": 1
    },
    {
      "campusId": "507f1f77bcf86cd799439012",
      "campusName": "Cơ sở 2 - Quận 7",
      "total": 10,
      "active": 8,
      "inactive": 1,
      "underMaintenance": 1
    }
  ]
}
```

**Giải thích các trường:**

- `data`: Mảng các object, mỗi object chứa:
  - `campusId`: ID của campus
  - `campusName`: Tên của campus
  - `total`: Tổng số khu vực trong campus
  - `active`: Số khu vực đang hoạt động (status = `ACTIVE`)
  - `inactive`: Số khu vực ngừng hoạt động (status = `INACTIVE`)
  - `underMaintenance`: Số khu vực đang bảo trì (status = `UNDERMAINTENANCE`)

---

## 📊 Trạng Thái (Status)

Các trạng thái được sử dụng trong hệ thống:

| Status             | Giá trị         | Mô tả                                        |
| ------------------ | --------------- | -------------------------------------------- |
| `ACTIVE`           | Đang hoạt động  | Tòa nhà/khu vực đang hoạt động bình thường   |
| `INACTIVE`         | Ngừng hoạt động | Tòa nhà/khu vực đã ngừng hoạt động           |
| `UNDERMAINTENANCE` | Đang bảo trì    | Tòa nhà/khu vực đang trong quá trình bảo trì |

**Lưu ý:** Tổng số (`total`) = `active` + `inactive` + `underMaintenance`

---

## 💻 Ví Dụ Sử Dụng

### JavaScript/TypeScript (Fetch API)

```javascript
// Lấy thống kê tòa nhà
async function getBuildingStats() {
  const response = await fetch(
    'http://your-api-domain/api/zone-area/buildings-stats',
  );
  const result = await response.json();
  console.log('Building Stats:', result.data);
  return result.data;
}

// Lấy thống kê khu vực
async function getAreaStats() {
  const response = await fetch(
    'http://your-api-domain/api/zone-area/areas-stats',
  );
  const result = await response.json();
  console.log('Area Stats:', result.data);
  return result.data;
}

// Lấy thống kê tòa nhà theo campus (tất cả campus)
async function getBuildingStatsByCampus() {
  const response = await fetch(
    'http://your-api-domain/api/zone-area/buildings-stats-by-campus',
  );
  const result = await response.json();
  console.log('Building Stats by Campus:', result.data);
  return result.data; // Mảng các campus với thống kê
}

// Lấy thống kê khu vực theo campus (tất cả campus)
async function getAreaStatsByCampus() {
  const response = await fetch(
    'http://your-api-domain/api/zone-area/areas-stats-by-campus',
  );
  const result = await response.json();
  console.log('Area Stats by Campus:', result.data);
  return result.data; // Mảng các campus với thống kê
}
```

### cURL

```bash
# Lấy thống kê tòa nhà
curl -X GET http://your-api-domain/api/zone-area/buildings-stats

# Lấy thống kê khu vực
curl -X GET http://your-api-domain/api/zone-area/areas-stats

# Lấy thống kê tòa nhà theo campus (tất cả campus)
curl -X GET http://your-api-domain/api/zone-area/buildings-stats-by-campus

# Lấy thống kê khu vực theo campus (tất cả campus)
curl -X GET http://your-api-domain/api/zone-area/areas-stats-by-campus
```

### Axios (React/Vue)

```javascript
import axios from 'axios';

// Lấy thống kê tòa nhà
const getBuildingStats = async () => {
  try {
    const response = await axios.get('/api/zone-area/buildings-stats');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching building stats:', error);
  }
};

// Lấy thống kê khu vực
const getAreaStats = async () => {
  try {
    const response = await axios.get('/api/zone-area/areas-stats');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching area stats:', error);
  }
};

// Lấy thống kê tòa nhà theo campus (tất cả campus)
const getBuildingStatsByCampus = async () => {
  try {
    const response = await axios.get(
      '/api/zone-area/buildings-stats-by-campus',
    );
    return response.data.data; // Mảng các campus với thống kê
  } catch (error) {
    console.error('Error fetching building stats by campus:', error);
    throw error;
  }
};

// Lấy thống kê khu vực theo campus (tất cả campus)
const getAreaStatsByCampus = async () => {
  try {
    const response = await axios.get('/api/zone-area/areas-stats-by-campus');
    return response.data.data; // Mảng các campus với thống kê
  } catch (error) {
    console.error('Error fetching area stats by campus:', error);
    throw error;
  }
};
```

---

## 🎯 Use Cases

### 1. Dashboard Overview

Hiển thị tổng quan về tình trạng tòa nhà và khu vực trên dashboard:

```javascript
const [buildingStats, setBuildingStats] = useState(null);
const [areaStats, setAreaStats] = useState(null);

useEffect(() => {
  // Fetch both stats
  Promise.all([
    fetch('/api/zone-area/buildings-stats').then((r) => r.json()),
    fetch('/api/zone-area/areas-stats').then((r) => r.json()),
  ]).then(([buildingRes, areaRes]) => {
    setBuildingStats(buildingRes.data);
    setAreaStats(areaRes.data);
  });
}, []);

// Display in UI
<div>
  <h2>Tòa Nhà</h2>
  <p>Tổng: {buildingStats?.total}</p>
  <p>Đang hoạt động: {buildingStats?.active}</p>
  <p>Ngừng hoạt động: {buildingStats?.inactive}</p>
  <p>Đang bảo trì: {buildingStats?.underMaintenance}</p>
</div>;
```

### 1.1. Dashboard Theo Campus

Hiển thị thống kê theo từng campus:

```javascript
const [buildingStatsByCampus, setBuildingStatsByCampus] = useState([]);
const [areaStatsByCampus, setAreaStatsByCampus] = useState([]);

useEffect(() => {
  // Fetch stats cho tất cả campus
  Promise.all([
    fetch('/api/zone-area/buildings-stats-by-campus').then((r) => r.json()),
    fetch('/api/zone-area/areas-stats-by-campus').then((r) => r.json()),
  ]).then(([buildingRes, areaRes]) => {
    setBuildingStatsByCampus(buildingRes.data);
    setAreaStatsByCampus(areaRes.data);
  });
}, []);

// Display in UI
{
  buildingStatsByCampus.map((campus) => {
    const areaStats = areaStatsByCampus.find(
      (a) => a.campusId === campus.campusId,
    );
    return (
      <div key={campus.campusId}>
        <h3>{campus.campusName}</h3>
        <h4>Tòa Nhà</h4>
        <p>Tổng: {campus.total}</p>
        <p>Đang hoạt động: {campus.active}</p>
        <p>Ngừng hoạt động: {campus.inactive}</p>
        <p>Đang bảo trì: {campus.underMaintenance}</p>
        <h4>Khu Vực</h4>
        {areaStats && (
          <>
            <p>Tổng: {areaStats.total}</p>
            <p>Đang hoạt động: {areaStats.active}</p>
            <p>Ngừng hoạt động: {areaStats.inactive}</p>
            <p>Đang bảo trì: {areaStats.underMaintenance}</p>
          </>
        )}
      </div>
    );
  });
}
```

### 2. Statistics Cards

Tạo các thẻ thống kê:

```javascript
const StatCard = ({ title, value, color }) => (
  <div className={`stat-card ${color}`}>
    <h3>{title}</h3>
    <p className="stat-value">{value}</p>
  </div>
);

// Usage
<StatCard title="Tổng Tòa Nhà" value={buildingStats?.total} color="blue" />
<StatCard title="Đang Hoạt Động" value={buildingStats?.active} color="green" />
<StatCard title="Ngừng Hoạt Động" value={buildingStats?.inactive} color="red" />
<StatCard title="Đang Bảo Trì" value={buildingStats?.underMaintenance} color="yellow" />
```

### 3. Charts/Graphs

Sử dụng với thư viện chart (Chart.js, Recharts, etc.):

```javascript
import { PieChart, Pie, Cell } from 'recharts';

const BuildingStatusChart = ({ stats }) => {
  const data = [
    { name: 'Đang hoạt động', value: stats.active, color: '#4CAF50' },
    { name: 'Ngừng hoạt động', value: stats.inactive, color: '#F44336' },
    { name: 'Đang bảo trì', value: stats.underMaintenance, color: '#FF9800' },
  ];

  return (
    <PieChart width={400} height={400}>
      <Pie
        data={data}
        cx={200}
        cy={200}
        labelLine={false}
        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        outerRadius={80}
        fill="#8884d8"
        dataKey="value"
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
    </PieChart>
  );
};
```

---

## ⚠️ Lưu Ý

1. **Performance:** Các API này sử dụng `countDocuments()` nên có thể chậm với database lớn. Nên cache kết quả nếu cần.

2. **Real-time:** Dữ liệu được tính toán real-time, không cache. Nếu cần cập nhật thường xuyên, cân nhắc sử dụng WebSocket hoặc polling.

3. **Error Handling:** Luôn xử lý lỗi khi gọi API:

```javascript
try {
  const response = await fetch('/api/zone-area/buildings-stats');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  // Use data
} catch (error) {
  console.error('Error:', error);
  // Handle error (show message, retry, etc.)
}
```

---

## 🔍 Kiểm Tra API

### Swagger/OpenAPI

Nếu có Swagger UI, có thể test trực tiếp tại:

- `http://your-api-domain/api/docs`

### Postman Collection

Import các endpoints sau vào Postman:

```json
{
  "name": "Building & Area Stats",
  "requests": [
    {
      "name": "Get Building Stats",
      "method": "GET",
      "url": "{{baseUrl}}/api/zone-area/buildings-stats"
    },
    {
      "name": "Get Area Stats",
      "method": "GET",
      "url": "{{baseUrl}}/api/zone-area/areas-stats"
    }
  ]
}
```

---

## 📝 Response Format

Tất cả responses đều tuân theo format chuẩn của NestJS:

```typescript
interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}
```

Với `T` là:

```typescript
interface StatsData {
  total: number;
  active: number;
  inactive: number;
  underMaintenance: number;
}
```

---

## 🐛 Troubleshooting

### Lỗi 404 Not Found

- Kiểm tra URL endpoint đúng chưa
- Kiểm tra base URL có `/api` prefix chưa
- Kiểm tra route đã được đăng ký trong module chưa

### Lỗi 500 Internal Server Error

- Kiểm tra database connection
- Kiểm tra logs server để xem chi tiết lỗi
- Kiểm tra schema Building/Area có field `status` không

### Dữ liệu không chính xác

- Kiểm tra dữ liệu trong database có đúng format status không
- Kiểm tra có building/area nào có status null không
- Kiểm tra enum `CommonStatus` có đúng giá trị không

---

## 📚 Related APIs

- `GET /api/zone-area/buildings` - Lấy danh sách tòa nhà
- `GET /api/zone-area/areas` - Lấy danh sách khu vực
- `GET /api/zone-area/zones-stats` - Thống kê zones (tương tự)
- `GET /api/campus` - Lấy danh sách campus
- `GET /api/zone-area/campus/:campusId/buildings` - Lấy danh sách tòa nhà theo campus
- `GET /api/zone-area/campus/:campusId/areas` - Lấy danh sách khu vực theo campus
- `GET /api/campus` - Lấy danh sách tất cả campus

---

## 🔄 Changelog

- **v1.1.0** (2024): Added campus-specific statistics
  - Thêm API `GET /api/zone-area/buildings-stats-by-campus` - Trả về thống kê tòa nhà của tất cả campus
  - Thêm API `GET /api/zone-area/areas-stats-by-campus` - Trả về thống kê khu vực của tất cả campus
  - Response là mảng các campus với thống kê (campusId, campusName, total, active, inactive, underMaintenance)

- **v1.0.0** (2024): Initial release
  - Thêm API `GET /api/zone-area/buildings-stats`
  - Thêm API `GET /api/zone-area/areas-stats`
  - Return 4 giá trị: total, active, inactive, underMaintenance
