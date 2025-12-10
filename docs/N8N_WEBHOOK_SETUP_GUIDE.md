# Hướng dẫn cấu hình N8N Webhooks

## Tổng quan

Hệ thống cung cấp các webhook endpoints để N8N có thể tự động gọi các chức năng automation như:

- Gửi báo cáo thống kê (tháng/quý/năm)
- Tự động đóng report cũ
- Tự động xóa audit logs hết hạn
- Gửi nhắc nhở audit quá hạn
- Gửi nhắc nhở audit sắp hết hạn

## Cấu hình cơ bản

### 1. Biến môi trường

Đảm bảo trong file `.env` của backend có:

```env
N8N_WEBHOOK_SECRET=n8nsercrereerer
```

### 2. Base URL

Tất cả webhook endpoints đều nằm dưới:

```
http://your-backend-url/api/automation/webhook/
```

**Ví dụ:**

- Development: `http://localhost:3000/api/automation/webhook/`
- Production: `https://api.yourdomain.com/api/automation/webhook/`

### 3. Authentication

Tất cả webhook endpoints đều yêu cầu header:

```
x-n8n-webhook-secret: n8nsercrereerer
```

Hoặc có thể gửi trong body:

```json
{
  "secret": "n8nsercrereerer"
}
```

---

## 1. Gửi báo cáo thống kê theo tháng

### Endpoint

```
POST /api/automation/webhook/send-monthly-report
```

### Cấu hình trong N8N

#### Bước 1: Tạo Schedule Trigger

1. Thêm node **Schedule Trigger**
2. Cấu hình:
   - **Trigger Interval**: `Monthly`
   - **Day of Month**: `1` (ngày 1 hàng tháng)
   - **Time**: `00:00` (nửa đêm)

#### Bước 2: Thêm HTTP Request Node

1. Thêm node **HTTP Request**
2. Cấu hình:
   - **Method**: `POST`
   - **URL**: `http://your-backend-url/api/automation/webhook/send-monthly-report`
   - **Authentication**: `None`
   - **Headers**:
     ```
     x-n8n-webhook-secret: n8nsercrereerer
     Content-Type: application/json
     ```
   - **Body** (Optional - để chỉ định khoảng thời gian cụ thể):
     ```json
     {
       "startDate": "2025-12-01",
       "endDate": "2025-12-31"
     }
     ```

#### Request Body (Optional)

```json
{
  "startDate": "2025-12-01", // ISO date string (optional)
  "endDate": "2025-12-31" // ISO date string (optional)
}
```

**Lưu ý:** Nếu không gửi `startDate` và `endDate`, hệ thống sẽ tự động tính toán tháng hiện tại.

#### Response (Success)

```json
{
  "success": true,
  "message": "Monthly statistics report sent",
  "data": {
    "success": true,
    "data": {
      "sent": 2,
      "failed": 0
    }
  },
  "timestamp": "2025-12-10T03:15:11.538Z",
  "path": "/api/automation/webhook/send-monthly-report"
}
```

#### Response (Error)

```json
{
  "statusCode": 401,
  "message": "Invalid or missing N8N webhook secret"
}
```

---

## 2. Gửi báo cáo thống kê theo quý

### Endpoint

```
POST /api/automation/webhook/send-quarterly-report
```

### Cấu hình trong N8N

#### Bước 1: Tạo Schedule Trigger

1. Thêm node **Schedule Trigger**
2. Cấu hình:
   - **Trigger Interval**: `Monthly`
   - **Day of Month**: `1` (ngày 1 hàng tháng)
   - **Months**: Chọn tháng đầu quý (1, 4, 7, 10)
   - **Time**: `00:00`

#### Bước 2: Thêm HTTP Request Node

1. Thêm node **HTTP Request**
2. Cấu hình:
   - **Method**: `POST`
   - **URL**: `http://your-backend-url/api/automation/webhook/send-quarterly-report`
   - **Headers**:
     ```
     x-n8n-webhook-secret: n8nsercrereerer
     Content-Type: application/json
     ```
   - **Body** (Optional):
     ```json
     {
       "startDate": "2025-10-01",
       "endDate": "2025-12-31"
     }
     ```

#### Request Body (Optional)

```json
{
  "startDate": "2025-10-01",
  "endDate": "2025-12-31"
}
```

#### Response

```json
{
  "success": true,
  "message": "Quarterly statistics report sent",
  "data": {
    "success": true,
    "data": {
      "sent": 2,
      "failed": 0
    }
  }
}
```

---

## 3. Gửi báo cáo thống kê theo năm

### Endpoint

```
POST /api/automation/webhook/send-yearly-report
```

### Cấu hình trong N8N

#### Bước 1: Tạo Schedule Trigger

1. Thêm node **Schedule Trigger**
2. Cấu hình:
   - **Trigger Interval**: `Yearly`
   - **Day of Year**: `1` (ngày 1 tháng 1)
   - **Time**: `00:00`

#### Bước 2: Thêm HTTP Request Node

1. Thêm node **HTTP Request**
2. Cấu hình:
   - **Method**: `POST`
   - **URL**: `http://your-backend-url/api/automation/webhook/send-yearly-report`
   - **Headers**:
     ```
     x-n8n-webhook-secret: n8nsercrereerer
     Content-Type: application/json
     ```
   - **Body** (Optional):
     ```json
     {
       "startDate": "2025-01-01",
       "endDate": "2025-12-31"
     }
     ```

#### Response

```json
{
  "success": true,
  "message": "Yearly statistics report sent",
  "data": {
    "success": true,
    "data": {
      "sent": 2,
      "failed": 0
    }
  }
}
```

---

## 4. Tự động đóng report cũ

### Endpoint

```
POST /api/automation/webhook/auto-close-reports
```

### Mô tả

Tự động đóng các report đã được resolved/approved quá lâu (mặc định >90 ngày).

### Cấu hình trong N8N

#### Bước 1: Tạo Schedule Trigger

1. Thêm node **Schedule Trigger**
2. Cấu hình:
   - **Trigger Interval**: `Daily`
   - **Time**: `02:00` (chạy vào 2h sáng mỗi ngày)

#### Bước 2: Thêm HTTP Request Node

1. Thêm node **HTTP Request**
2. Cấu hình:
   - **Method**: `POST`
   - **URL**: `http://your-backend-url/api/automation/webhook/auto-close-reports`
   - **Headers**:
     ```
     x-n8n-webhook-secret: n8nsercrereerer
     Content-Type: application/json
     ```
   - **Body** (Optional):
     ```json
     {
       "daysOld": 90
     }
     ```

#### Request Body (Optional)

```json
{
  "daysOld": 90 // Số ngày (mặc định: 90)
}
```

#### Response

```json
{
  "success": true,
  "message": "Auto-closed 5 old reports",
  "data": {
    "closedCount": 5
  }
}
```

---

## 5. Tự động xóa audit logs hết hạn

### Endpoint

```
POST /api/automation/webhook/auto-delete-expired-audits
```

### Mô tả

Tự động xóa các audit logs đã hết hạn quá lâu (mặc định sau 30 ngày kể từ ngày hết hạn).

### Cấu hình trong N8N

#### Bước 1: Tạo Schedule Trigger

1. Thêm node **Schedule Trigger**
2. Cấu hình:
   - **Trigger Interval**: `Daily`
   - **Time**: `03:00` (chạy vào 3h sáng mỗi ngày)

#### Bước 2: Thêm HTTP Request Node

1. Thêm node **HTTP Request**
2. Cấu hình:
   - **Method**: `POST`
   - **URL**: `http://your-backend-url/api/automation/webhook/auto-delete-expired-audits`
   - **Headers**:
     ```
     x-n8n-webhook-secret: n8nsercrereerer
     Content-Type: application/json
     ```
   - **Body** (Optional):
     ```json
     {
       "daysAfterExpiration": 30
     }
     ```

#### Request Body (Optional)

```json
{
  "daysAfterExpiration": 30 // Số ngày sau khi hết hạn (mặc định: 30)
}
```

#### Response

```json
{
  "success": true,
  "message": "Auto-deleted 12 expired audit logs",
  "data": {
    "deletedCount": 12
  }
}
```

---

## 6. Gửi nhắc nhở audit quá hạn

### Endpoint

```
POST /api/automation/webhook/send-overdue-reminders
```

### Mô tả

Gửi email nhắc nhở cho các staff có audit đã quá hạn xử lý.

### Cấu hình trong N8N

#### Bước 1: Tạo Schedule Trigger

1. Thêm node **Schedule Trigger**
2. Cấu hình:
   - **Trigger Interval**: `Daily`
   - **Time**: `08:00` (chạy vào 8h sáng mỗi ngày)

#### Bước 2: Thêm HTTP Request Node

1. Thêm node **HTTP Request**
2. Cấu hình:
   - **Method**: `POST`
   - **URL**: `http://your-backend-url/api/automation/webhook/send-overdue-reminders`
   - **Headers**:
     ```
     x-n8n-webhook-secret: n8nsercrereerer
     Content-Type: application/json
     ```
   - **Body**: Không cần (hoặc `{}`)

#### Response

```json
{
  "success": true,
  "message": "Overdue audit reminders sent",
  "data": {
    "sent": 5,
    "failed": 0
  }
}
```

---

## 7. Gửi nhắc nhở audit sắp hết hạn

### Endpoint

```
POST /api/automation/webhook/send-expiring-reminders
```

### Mô tả

Gửi email nhắc nhở cho các staff có audit sắp hết hạn (mặc định 3 ngày trước).

### Cấu hình trong N8N

#### Bước 1: Tạo Schedule Trigger

1. Thêm node **Schedule Trigger**
2. Cấu hình:
   - **Trigger Interval**: `Daily`
   - **Time**: `09:00` (chạy vào 9h sáng mỗi ngày)

#### Bước 2: Thêm HTTP Request Node

1. Thêm node **HTTP Request**
2. Cấu hình:
   - **Method**: `POST`
   - **URL**: `http://your-backend-url/api/automation/webhook/send-expiring-reminders`
   - **Headers**:
     ```
     x-n8n-webhook-secret: n8nsercrereerer
     Content-Type: application/json
     ```
   - **Body** (Optional):
     ```json
     {
       "daysBefore": 3
     }
     ```

#### Request Body (Optional)

```json
{
  "daysBefore": 3 // Số ngày trước khi hết hạn (mặc định: 3)
}
```

#### Response

```json
{
  "success": true,
  "message": "Expiring audit reminders sent",
  "data": {
    "sent": 3,
    "failed": 0
  }
}
```

---

## 8. Test endpoint - Gửi báo cáo đến email cụ thể

### Endpoint

```
POST /api/automation/webhook/test-send-report
```

### Mô tả

Endpoint để test gửi báo cáo đến một email cụ thể (không cần admin account).

### Cấu hình trong N8N

#### HTTP Request Node

1. Thêm node **HTTP Request**
2. Cấu hình:
   - **Method**: `POST`
   - **URL**: `http://your-backend-url/api/automation/webhook/test-send-report`
   - **Headers**:
     ```
     x-n8n-webhook-secret: n8nsercrereerer
     Content-Type: application/json
     ```
   - **Body**:
     ```json
     {
       "email": "test@example.com",
       "period": "month",
       "startDate": "2025-12-01",
       "endDate": "2025-12-31"
     }
     ```

#### Request Body (Required)

```json
{
  "email": "test@example.com", // Required
  "period": "month", // Optional: month | quarter | year
  "startDate": "2025-12-01", // Optional: ISO date string
  "endDate": "2025-12-31" // Optional: ISO date string
}
```

#### Response

```json
{
  "success": true,
  "message": "Test report sent",
  "data": {
    "success": true,
    "message": "Report sent successfully to test@example.com"
  }
}
```

---

## Ví dụ Workflow hoàn chỉnh

### Workflow: Gửi báo cáo tháng tự động

```
┌─────────────────┐
│ Schedule Trigger│
│ (Monthly, Day 1)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  HTTP Request   │
│ send-monthly-   │
│ report          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  IF Node        │
│ Check response  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌────────┐
│Success│ │ Error  │
│Email  │ │ Log    │
└───────┘ └────────┘
```

### Cấu hình IF Node (kiểm tra kết quả)

**Condition:**

```
{{ $json.success }} === true
```

**True Output:** Gửi email thông báo thành công
**False Output:** Gửi email thông báo lỗi hoặc log lỗi

---

## Xem lịch sử email đã gửi

### Endpoint

```
GET /api/automation/report-logs
```

### Authentication

Yêu cầu JWT token với permission `REPORT:READ`

### Query Parameters

- `email` - Lọc theo email
- `period` - Lọc theo period (month/quarter/year)
- `status` - Lọc theo status (success/failed)
- `isTest` - Lọc theo loại email (true/false)
- `page` - Số trang (mặc định: 1)
- `limit` - Số item mỗi trang (mặc định: 20)

### Ví dụ

```bash
GET /api/automation/report-logs?email=admin@iuh.com&status=success&page=1&limit=10
Authorization: Bearer <your-jwt-token>
```

### Response

```json
{
  "message": "Lấy lịch sử gửi email thành công",
  "data": {
    "logs": [
      {
        "_id": "...",
        "email": "admin@iuh.com",
        "recipientName": "ADMIN",
        "period": "month",
        "startDate": "2025-12-01T00:00:00.000Z",
        "endDate": "2025-12-31T23:59:59.999Z",
        "status": "success",
        "isTest": false,
        "createdAt": "2025-12-10T03:15:11.538Z",
        "updatedAt": "2025-12-10T03:15:11.538Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "itemsPerPage": 20
    }
  }
}
```

---

## Troubleshooting

### Lỗi: "Invalid or missing N8N webhook secret"

- **Nguyên nhân**: Header `x-n8n-webhook-secret` không đúng hoặc thiếu
- **Giải pháp**: Kiểm tra lại secret key trong `.env` và header trong N8N

### Lỗi: "No admin accounts found to send report"

- **Nguyên nhân**: Không có admin account trong database
- **Giải pháp**: Tạo admin account hoặc dùng endpoint test với email cụ thể

### Lỗi: "ECONNREFUSED"

- **Nguyên nhân**: Backend không chạy hoặc URL sai
- **Giải pháp**:
  - Kiểm tra backend đã chạy chưa
  - Kiểm tra URL trong N8N có đúng không
  - Thử dùng `127.0.0.1` thay vì `localhost` nếu có vấn đề với IPv6

### Email không được gửi

- **Kiểm tra**:
  1. Cấu hình email trong `.env` (EMAIL_USER, EMAIL_PASSWORD, EMAIL_PORT)
  2. Logs của backend để xem lỗi chi tiết
  3. Spam folder của email nhận
  4. Có admin account với `isActive = true` không

---

## Best Practices

1. **Schedule Timing**:
   - Gửi báo cáo vào đầu tháng/quý/năm (ngày 1, giờ 0h)
   - Chạy cleanup tasks vào giờ thấp điểm (2-3h sáng)
   - Gửi reminders vào giờ làm việc (8-9h sáng)

2. **Error Handling**:
   - Luôn thêm IF node để kiểm tra response
   - Log lỗi hoặc gửi thông báo khi có lỗi
   - Retry logic cho các task quan trọng

3. **Monitoring**:
   - Kiểm tra logs định kỳ
   - Sử dụng endpoint `/api/automation/report-logs` để xem lịch sử
   - Thiết lập alert khi có nhiều email failed

4. **Testing**:
   - Dùng endpoint test trước khi deploy production workflow
   - Test với email của chính bạn trước
   - Kiểm tra format email template

---

## Tổng kết các endpoints

| Endpoint                      | Method | Mô tả                | Schedule gợi ý           |
| ----------------------------- | ------ | -------------------- | ------------------------ |
| `/send-monthly-report`        | POST   | Gửi báo cáo tháng    | Ngày 1 hàng tháng, 0h    |
| `/send-quarterly-report`      | POST   | Gửi báo cáo quý      | Ngày 1 tháng đầu quý, 0h |
| `/send-yearly-report`         | POST   | Gửi báo cáo năm      | Ngày 1/1, 0h             |
| `/auto-close-reports`         | POST   | Đóng report cũ       | Hàng ngày, 2h sáng       |
| `/auto-delete-expired-audits` | POST   | Xóa audit hết hạn    | Hàng ngày, 3h sáng       |
| `/send-overdue-reminders`     | POST   | Nhắc nhở quá hạn     | Hàng ngày, 8h sáng       |
| `/send-expiring-reminders`    | POST   | Nhắc nhở sắp hết hạn | Hàng ngày, 9h sáng       |
| `/test-send-report`           | POST   | Test gửi email       | Manual trigger           |

---

**Lưu ý**: Tất cả các webhook endpoints đều yêu cầu header `x-n8n-webhook-secret` với giá trị từ biến môi trường `N8N_WEBHOOK_SECRET`.
