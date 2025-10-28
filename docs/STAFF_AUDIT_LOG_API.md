# Staff Audit Log API Documentation

## Tổng quan

API này cho phép nhân viên lấy danh sách audit log của chính họ dựa trên token JWT và các tham số thời gian khác nhau (ngày, tuần, tháng).

## Endpoint

### Lấy audit log của nhân viên

```
GET /audit/staff/my-logs
```

**Mô tả:** Lấy danh sách audit log của nhân viên hiện tại (ID được lấy từ JWT token) theo khoảng thời gian được chỉ định.

**Authentication:** Required (JWT Bearer Token)
**Permissions:** `AUDIT:READ`

## Request Parameters

### Query Parameters

| Parameter   | Type   | Required      | Default     | Description                                                |
| ----------- | ------ | ------------- | ----------- | ---------------------------------------------------------- |
| `timeRange` | string | No            | `day`       | Loại khoảng thời gian: `day`, `week`, `month`              |
| `date`      | string | Conditional\* | -           | Ngày cụ thể (YYYY-MM-DD) - Required khi `timeRange=day`    |
| `week`      | number | Conditional\* | -           | Số tuần (1-53) - Required khi `timeRange=week`             |
| `year`      | number | Conditional\* | -           | Năm - Required khi `timeRange=week` hoặc `timeRange=month` |
| `month`     | number | Conditional\* | -           | Số tháng (1-12) - Required khi `timeRange=month`           |
| `page`      | number | No            | `1`         | Số trang                                                   |
| `limit`     | number | No            | `10`        | Số lượng items mỗi trang (max: 100)                        |
| `sortBy`    | string | No            | `createdAt` | Trường để sắp xếp                                          |
| `sortOrder` | string | No            | `desc`      | Thứ tự sắp xếp: `asc` hoặc `desc`                          |

\*Conditional: Required dựa trên giá trị của `timeRange`

### Ví dụ Request

#### 1. Lấy audit log theo ngày cụ thể

```
GET /audit/staff/my-logs?timeRange=day&date=2024-01-15
```

#### 2. Lấy audit log theo tuần

```
GET /audit/staff/my-logs?timeRange=week&week=3&year=2024
```

#### 3. Lấy audit log theo tháng

```
GET /audit/staff/my-logs?timeRange=month&month=1&year=2024
```

#### 4. Với pagination và sorting

```
GET /audit/staff/my-logs?timeRange=day&date=2024-01-15&page=1&limit=20&sortBy=createdAt&sortOrder=asc
```

## Response

### Success Response (200 OK)

```json
{
  "message": "Lấy danh sách bản ghi kiểm tra của nhân viên thành công",
  "auditLogs": [
    {
      "_id": "65a1b2c3d4e5f6789012345",
      "status": "COMPLETED",
      "subject": "Kiểm tra định kỳ máy tính",
      "description": "Kiểm tra tình trạng hoạt động của máy tính",
      "images": [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg"
      ],
      "createdAt": "2024-01-15T08:30:00.000Z",
      "updatedAt": "2024-01-15T09:00:00.000Z",
      "report": {
        "_id": "65a1b2c3d4e5f6789012346",
        "type": "MAINTENANCE",
        "status": "RESOLVED",
        "description": "Báo cáo bảo trì máy tính",
        "images": [],
        "createdBy": {
          "_id": "65a1b2c3d4e5f6789012347",
          "fullName": "Nguyễn Văn A",
          "email": "nguyenvana@example.com"
        },
        "asset": {
          "_id": "65a1b2c3d4e5f6789012348",
          "name": "Máy tính Dell Optiplex",
          "code": "PC001",
          "status": "ACTIVE",
          "image": "https://example.com/asset-image.jpg",
          "zone": {
            "_id": "65a1b2c3d4e5f6789012349",
            "name": "Phòng máy tính A1",
            "building": {
              "_id": "65a1b2c3d4e5f678901234a",
              "name": "Tòa nhà A",
              "campus": {
                "_id": "65a1b2c3d4e5f678901234b",
                "name": "Campus chính"
              }
            }
          },
          "area": null
        }
      },
      "staffs": [
        {
          "_id": "65a1b2c3d4e5f678901234c",
          "fullName": "Trần Thị B",
          "email": "tranthib@example.com"
        }
      ]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 25,
    "itemsPerPage": 10
  },
  "timeRange": {
    "type": "day",
    "startDate": "2024-01-15T00:00:00.000Z",
    "endDate": "2024-01-15T23:59:59.999Z"
  }
}
```

### Error Responses

#### 400 Bad Request - Missing required parameters

```json
{
  "statusCode": 400,
  "message": "Ngày không được để trống khi chọn loại ngày",
  "error": "Bad Request"
}
```

#### 401 Unauthorized - Invalid or missing token

```json
{
  "statusCode": 401,
  "message": "Token không hợp lệ",
  "error": "Unauthorized"
}
```

#### 403 Forbidden - Insufficient permissions

```json
{
  "statusCode": 403,
  "message": "Không có quyền truy cập",
  "error": "Forbidden"
}
```

## Các trường hợp sử dụng

### 1. Lấy audit log theo ngày

- **Mục đích:** Xem tất cả audit log trong một ngày cụ thể
- **Tham số:** `timeRange=day`, `date=YYYY-MM-DD`
- **Ví dụ:** Lấy audit log ngày 15/01/2024

### 2. Lấy audit log theo tuần

- **Mục đích:** Xem tất cả audit log trong một tuần cụ thể của năm
- **Tham số:** `timeRange=week`, `week=1-53`, `year=YYYY`
- **Ví dụ:** Lấy audit log tuần thứ 3 năm 2024

### 3. Lấy audit log theo tháng

- **Mục đích:** Xem tất cả audit log trong một tháng cụ thể
- **Tham số:** `timeRange=month`, `month=1-12`, `year=YYYY`
- **Ví dụ:** Lấy audit log tháng 1 năm 2024

## Lưu ý quan trọng

1. **Authentication:** API yêu cầu JWT token hợp lệ trong header `Authorization: Bearer <token>`
2. **Staff ID:** ID của nhân viên được tự động lấy từ JWT token (field `sub`)
3. **Time Range Logic:**
   - **Day:** Từ 00:00:00 đến 23:59:59 của ngày được chỉ định
   - **Week:** Tuần được tính từ thứ 2 đến chủ nhật, tuần 1 bắt đầu từ thứ 2 đầu tiên của năm
   - **Month:** Từ ngày 1 đến ngày cuối cùng của tháng
4. **Pagination:** Mặc định trả về 10 items mỗi trang, tối đa 100 items
5. **Sorting:** Có thể sắp xếp theo bất kỳ trường nào, mặc định theo `createdAt` giảm dần

## Ví dụ sử dụng với các công cụ

### cURL

```bash
# Lấy audit log theo ngày
curl -X GET "http://localhost:3000/audit/staff/my-logs?timeRange=day&date=2024-01-15" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Lấy audit log theo tuần
curl -X GET "http://localhost:3000/audit/staff/my-logs?timeRange=week&week=3&year=2024" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript/Fetch

```javascript
// Lấy audit log theo tháng
const response = await fetch(
  '/audit/staff/my-logs?timeRange=month&month=1&year=2024',
  {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
  },
);

const data = await response.json();
console.log(data);
```

### Postman

1. **Method:** GET
2. **URL:** `{{base_url}}/audit/staff/my-logs`
3. **Headers:**
   - `Authorization: Bearer {{jwt_token}}`
4. **Query Params:**
   - `timeRange`: `day`
   - `date`: `2024-01-15`
