# Hướng Dẫn Tích Hợp N8N với IUH Infrastructure Management

## Tổng Quan

Module Automation cung cấp các webhook endpoints để tích hợp với N8N, cho phép tự động hóa các tác vụ như:

- Gửi báo cáo thống kê định kỳ (tháng/quý/năm)
- Tự động đóng report cũ
- Tự động xóa audit logs hết hạn
- Gửi nhắc nhở cho audit logs quá hạn/sắp hết hạn

---

## Các Webhook Endpoints

### 1. Gửi Báo Cáo Thống Kê

#### 📊 Gửi báo cáo tháng

- **URL**: `POST /api/automation/webhook/send-monthly-report`
- **Body** (optional):
  ```json
  {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Monthly statistics report sent",
    "data": {
      "sent": 3,
      "failed": 0
    }
  }
  ```

#### 📊 Gửi báo cáo quý

- **URL**: `POST /api/automation/webhook/send-quarterly-report`
- **Body**: Tương tự monthly report

#### 📊 Gửi báo cáo năm

- **URL**: `POST /api/automation/webhook/send-yearly-report`
- **Body**: Tương tự monthly report

---

### 2. Tự Động Đóng Report Cũ

- **URL**: `POST /api/automation/webhook/auto-close-reports`
- **Body** (optional):
  ```json
  {
    "daysOld": 90
  }
  ```
- **Mô tả**: Tự động đóng các report đã RESOLVED quá 90 ngày (mặc định)
- **Response**:
  ```json
  {
    "success": true,
    "message": "Auto-closed 15 old reports",
    "data": {
      "closedCount": 15
    }
  }
  ```

---

### 3. Tự Động Xóa Audit Logs Hết Hạn

- **URL**: `POST /api/automation/webhook/auto-delete-expired-audits`
- **Body** (optional):
  ```json
  {
    "daysAfterExpiration": 30
  }
  ```
- **Mô tả**: Tự động xóa các audit logs đã hết hạn quá 30 ngày (mặc định)
- **Response**:
  ```json
  {
    "success": true,
    "message": "Auto-deleted 8 expired audit logs",
    "data": {
      "deletedCount": 8
    }
  }
  ```

---

### 4. Gửi Nhắc Nhở Audit Quá Hạn

- **URL**: `POST /api/automation/webhook/send-overdue-reminders`
- **Mô tả**: Gửi email nhắc nhở cho tất cả staff có audit logs đã quá hạn
- **Response**:
  ```json
  {
    "success": true,
    "message": "Overdue audit reminders sent",
    "data": {
      "sent": 12,
      "failed": 0
    }
  }
  ```

---

### 5. Gửi Nhắc Nhở Audit Sắp Hết Hạn

- **URL**: `POST /api/automation/webhook/send-expiring-reminders`
- **Body** (optional):
  ```json
  {
    "daysBefore": 3
  }
  ```
- **Mô tả**: Gửi email nhắc nhở cho các audit logs sắp hết hạn trong 3 ngày (mặc định)
- **Response**:
  ```json
  {
    "success": true,
    "message": "Expiring audit reminders sent",
    "data": {
      "sent": 5,
      "failed": 0
    }
  }
  ```

---

## Cấu Hình N8N Workflows

### Workflow 1: Gửi Báo Cáo Thống Kê Hàng Tháng

1. **Trigger**: Schedule Trigger (Cron: `0 0 1 * *` - 00:00 ngày 1 hàng tháng)
2. **Node**: HTTP Request
   - Method: POST
   - URL: `http://your-api-url/api/automation/webhook/send-monthly-report`
   - Headers:
     - `x-n8n-webhook-secret`: `{{$env.N8N_WEBHOOK_SECRET}}` (hoặc giá trị từ .env)

### Workflow 2: Gửi Báo Cáo Thống Kê Hàng Quý

1. **Trigger**: Schedule Trigger (Cron: `0 0 1 */3 *` - 00:00 ngày 1 mỗi quý)
2. **Node**: HTTP Request
   - Method: POST
   - URL: `http://your-api-url/api/automation/webhook/send-quarterly-report`

### Workflow 3: Gửi Báo Cáo Thống Kê Hàng Năm

1. **Trigger**: Schedule Trigger (Cron: `0 0 1 1 *` - 00:00 ngày 1 tháng 1)
2. **Node**: HTTP Request
   - Method: POST
   - URL: `http://your-api-url/api/automation/webhook/send-yearly-report`

### Workflow 4: Tự Động Đóng Report Cũ (Hàng Tuần)

1. **Trigger**: Schedule Trigger (Cron: `0 0 * * 0` - 00:00 Chủ nhật hàng tuần)
2. **Node**: HTTP Request
   - Method: POST
   - URL: `http://your-api-url/api/automation/webhook/auto-close-reports`
   - Body:
     ```json
     {
       "daysOld": 90
     }
     ```

### Workflow 5: Tự Động Xóa Audit Logs Hết Hạn (Hàng Tuần)

1. **Trigger**: Schedule Trigger (Cron: `0 0 * * 0` - 00:00 Chủ nhật hàng tuần)
2. **Node**: HTTP Request
   - Method: POST
   - URL: `http://your-api-url/api/automation/webhook/auto-delete-expired-audits`
   - Body:
     ```json
     {
       "daysAfterExpiration": 30
     }
     ```

### Workflow 6: Gửi Nhắc Nhở Audit Quá Hạn (Hàng Ngày)

1. **Trigger**: Schedule Trigger (Cron: `0 9 * * *` - 09:00 hàng ngày)
2. **Node**: HTTP Request
   - Method: POST
   - URL: `http://your-api-url/api/automation/webhook/send-overdue-reminders`

### Workflow 7: Gửi Nhắc Nhở Audit Sắp Hết Hạn (Hàng Ngày)

1. **Trigger**: Schedule Trigger (Cron: `0 9 * * *` - 09:00 hàng ngày)
2. **Node**: HTTP Request
   - Method: POST
   - URL: `http://your-api-url/api/automation/webhook/send-expiring-reminders`
   - Body:
     ```json
     {
       "daysBefore": 3
     }
     ```

---

## Bảo Mật

⚠️ **Lưu ý**: Các webhook endpoints hiện tại là public (không cần authentication).

**Khuyến nghị bảo mật**:

1. Thêm API key authentication
2. Sử dụng N8N webhook authentication
3. Hoặc thêm IP whitelist cho N8N server

**Cách thêm API key**:

1. Thêm biến môi trường `N8N_WEBHOOK_SECRET` vào `.env`
2. Cập nhật controller để validate secret từ header hoặc body

---

## Các Tính Năng Tự Động Hóa Khác Có Thể Phát Triển

### 1. Tự Động Gửi Thông Báo Report Mới

- Gửi email/SMS cho admin khi có report mới với priority CRITICAL
- Gửi thông báo cho staff được assign

### 2. Tự Động Phân Công Staff

- Dựa trên skills và workload hiện tại
- Tự động assign staff phù hợp cho audit log mới

### 3. Tự Động Tạo Báo Cáo Bảo Trì

- Tạo maintenance schedule dựa trên asset warranty
- Nhắc nhở bảo trì định kỳ

### 4. Tự Động Backup Dữ Liệu

- Backup database định kỳ
- Backup Qdrant vector database

### 5. Tự Động Cleanup

- Xóa file upload cũ không sử dụng
- Xóa cache Redis cũ
- Xóa logs cũ

### 6. Tự Động Monitoring

- Kiểm tra health check của services
- Gửi alert khi có lỗi
- Monitor API response time

---

## Testing

### Test Manual với cURL:

```bash
# Gửi báo cáo tháng
curl -X POST http://localhost:3000/api/automation/webhook/send-monthly-report \
  -H "Content-Type: application/json"

# Tự động đóng report cũ
curl -X POST http://localhost:3000/api/automation/webhook/auto-close-reports \
  -H "Content-Type: application/json" \
  -d '{"daysOld": 90}'

# Gửi nhắc nhở quá hạn
curl -X POST http://localhost:3000/api/automation/webhook/send-overdue-reminders \
  -H "Content-Type: application/json"
```

---

## Troubleshooting

### Lỗi: Email không được gửi

- Kiểm tra cấu hình SMTP trong `.env`
- Kiểm tra logs để xem lỗi cụ thể
- Đảm bảo admin accounts có email hợp lệ

### Lỗi: Không tìm thấy admin

- Kiểm tra role của accounts (phải là ADMIN hoặc SUPER_ADMIN)
- Đảm bảo accounts có `isActive: true`

### Lỗi: Webhook không hoạt động

- Kiểm tra URL endpoint
- Kiểm tra CORS settings
- Kiểm tra network connectivity giữa N8N và API server

---

## Tài Liệu Tham Khảo

- [N8N Documentation](https://docs.n8n.io/)
- [N8N Schedule Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/)
- [N8N HTTP Request](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
