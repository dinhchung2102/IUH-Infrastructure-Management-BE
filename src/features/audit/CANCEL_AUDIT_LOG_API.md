# API Hủy Bỏ Nhiệm Vụ Kiểm Tra (Cancel Audit Log)

## 📋 Tổng quan

API này cho phép hủy bỏ một nhiệm vụ kiểm tra (audit log) với các thông tin chi tiết về người hủy, thời gian hủy và lý do hủy. Hệ thống sẽ tự động gửi thông báo socket cho các bên liên quan dựa trên vai trò của người hủy.

## 🎯 Mục đích

- Cho phép Admin hoặc Staff được giao nhiệm vụ hủy bỏ audit log
- Lưu trữ thông tin chi tiết về việc hủy bỏ (người hủy, thời gian, lý do)
- Tự động thông báo qua socket cho các bên liên quan:
  - **Admin hủy** → Thông báo cho tất cả Staff được giao nhiệm vụ
  - **Staff hủy** → Thông báo cho tất cả Admin

## 🔌 API Endpoint

### POST `/api/audit/:id/cancel`

Hủy bỏ một nhiệm vụ kiểm tra.

**Authentication:** Required (JWT Token)

**Permissions:** `AUDIT:UPDATE`

### Request Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Path Parameters

| Parameter | Type   | Required | Description      |
| --------- | ------ | -------- | ---------------- |
| `id`      | string | Yes      | ID của audit log |

### Request Body

```json
{
  "cancelReason": "Lý do hủy bỏ nhiệm vụ (tối thiểu 5 ký tự, tối đa 500 ký tự)"
}
```

**Validation Rules:**

- `cancelReason`: Bắt buộc, chuỗi, 5-500 ký tự

### Response

#### Success (200 OK)

```json
{
  "message": "Hủy bỏ bản ghi kiểm tra thành công",
  "data": {
    "_id": "68a67f1a89ba03c434bc0364",
    "subject": "Kiểm tra hệ thống điện",
    "status": "CANCELLED",
    "cancelledBy": {
      "_id": "693bc0b79512dd56dc47baf9",
      "fullName": "Nguyễn Văn A",
      "email": "admin@iuh.com"
    },
    "cancelledAt": "2025-01-15T10:30:00.000Z",
    "cancelReason": "Nhiệm vụ không còn cần thiết do đã được xử lý bằng cách khác",
    "staffs": [
      {
        "_id": "693bc0b79512dd56dc47baf8",
        "fullName": "Nhân viên B",
        "email": "staff@iuh.com"
      }
    ],
    "report": {
      "_id": "68a67f1a89ba03c434bc0365",
      "type": "MAINTENANCE",
      "description": "Mô tả báo cáo"
    }
  }
}
```

#### Error Responses

**400 Bad Request** - Audit log không thể hủy

```json
{
  "statusCode": 400,
  "message": "Không thể hủy bản ghi kiểm tra đã hoàn thành",
  "error": "Bad Request"
}
```

**403 Forbidden** - Không có quyền hủy

```json
{
  "statusCode": 403,
  "message": "Bạn không có quyền hủy bỏ bản ghi kiểm tra này",
  "error": "Forbidden"
}
```

**404 Not Found** - Audit log không tồn tại

```json
{
  "statusCode": 404,
  "message": "Bản ghi kiểm tra không tồn tại",
  "error": "Not Found"
}
```

## 🔐 Quyền Truy Cập

### Ai có thể hủy?

1. **Admin** (`ADMIN`, `CAMPUS_ADMIN`): Có thể hủy bất kỳ audit log nào (trừ đã COMPLETED hoặc CANCELLED)
2. **Staff được giao nhiệm vụ**: Chỉ có thể hủy audit log mà họ được giao

### Điều kiện hủy

- Audit log phải tồn tại
- Status không được là `COMPLETED` hoặc `CANCELLED`
- Người hủy phải là Admin hoặc Staff được giao nhiệm vụ

## 📨 Socket Notifications

### Khi Admin hủy

**Gửi notification cho:** Tất cả Staff được giao nhiệm vụ

**Event:** `notification`

**Payload:**

```json
{
  "type": "warning",
  "title": "Nhiệm vụ kiểm tra đã bị hủy bỏ",
  "message": "Nhiệm vụ \"Kiểm tra hệ thống điện\" đã bị hủy bỏ bởi quản trị viên",
  "data": {
    "auditLogId": "68a67f1a89ba03c434bc0364",
    "subject": "Kiểm tra hệ thống điện",
    "cancelReason": "Nhiệm vụ không còn cần thiết",
    "cancelledBy": "Nguyễn Văn A",
    "cancelledAt": "2025-01-15T10:30:00.000Z"
  },
  "timestamp": "2025-01-15T10:30:05.123Z"
}
```

### Khi Staff hủy

**Gửi notification cho:** Tất cả Admin (`ADMIN`, `CAMPUS_ADMIN`)

**Event:** `notification`

**Payload:**

```json
{
  "type": "warning",
  "title": "Nhiệm vụ kiểm tra đã bị hủy bỏ",
  "message": "Nhân viên đã hủy bỏ nhiệm vụ: \"Kiểm tra hệ thống điện\"",
  "data": {
    "auditLogId": "68a67f1a89ba03c434bc0364",
    "subject": "Kiểm tra hệ thống điện",
    "cancelReason": "Không thể thực hiện do thiếu thiết bị",
    "cancelledBy": "Nhân viên B",
    "cancelledAt": "2025-01-15T10:30:00.000Z",
    "staffName": "Nhân viên B"
  },
  "timestamp": "2025-01-15T10:30:05.123Z"
}
```

## 📊 Schema Updates

### AuditLog Schema

Đã thêm các field mới:

```typescript
{
  cancelledBy?: ObjectId;      // ID người hủy bỏ
  cancelledAt?: Date;          // Thời gian hủy bỏ
  cancelReason?: string;        // Lý do hủy bỏ
}
```

## 💻 Ví dụ Code

### Frontend (React/TypeScript)

```typescript
import { useState } from 'react';
import axios from 'axios';

interface CancelAuditLogRequest {
  cancelReason: string;
}

const cancelAuditLog = async (
  auditId: string,
  cancelReason: string,
  token: string,
) => {
  try {
    const response = await axios.post(
      `/api/audit/${auditId}/cancel`,
      { cancelReason },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};

// Usage
const handleCancel = async () => {
  try {
    const result = await cancelAuditLog(
      '68a67f1a89ba03c434bc0364',
      'Lý do hủy bỏ nhiệm vụ',
      accessToken,
    );
    console.log('Cancelled:', result);
  } catch (error) {
    console.error('Failed to cancel:', error);
  }
};
```

### Frontend (Vue 3/TypeScript)

```typescript
import { ref } from 'vue';
import axios from 'axios';

interface CancelAuditLogRequest {
  cancelReason: string;
}

export const useCancelAuditLog = () => {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const cancelAuditLog = async (
    auditId: string,
    cancelReason: string,
    token: string,
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `/api/audit/${auditId}/cancel`,
        { cancelReason },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to cancel audit log';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return { cancelAuditLog, loading, error };
};
```

### Nhận Socket Notification

```typescript
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const useAuditCancellationNotification = (
  userId: string,
  accountId: string,
  role: string,
) => {
  useEffect(() => {
    const socket = io('http://localhost:3000/events', {
      query: {
        userId,
        accountId,
        role,
      },
      transports: ['websocket'],
      reconnection: true,
    });

    socket.on('notification', (data) => {
      // Check if it's a cancellation notification
      if (
        data.type === 'warning' &&
        data.data?.auditLogId &&
        data.title === 'Nhiệm vụ kiểm tra đã bị hủy bỏ'
      ) {
        console.log('Audit log cancelled:', data);
        // Show notification to user
        showNotification(data);
      }
    });

    return () => {
      socket.close();
    };
  }, [userId, accountId, role]);
};
```

## 🔄 Workflow

### Khi Admin hủy

1. Admin gọi API `POST /api/audit/:id/cancel` với `cancelReason`
2. Hệ thống kiểm tra quyền và điều kiện
3. Cập nhật audit log:
   - `status` → `CANCELLED`
   - `cancelledBy` → ID của admin
   - `cancelledAt` → Thời gian hiện tại
   - `cancelReason` → Lý do hủy
4. Gửi socket notification cho tất cả Staff được giao nhiệm vụ
5. Emit custom event `auditlog:cancelled` cho tất cả clients

### Khi Staff hủy

1. Staff gọi API `POST /api/audit/:id/cancel` với `cancelReason`
2. Hệ thống kiểm tra:
   - Staff có trong danh sách `staffs` của audit log
   - Audit log chưa COMPLETED hoặc CANCELLED
3. Cập nhật audit log tương tự như trên
4. Gửi socket notification cho tất cả Admin
5. Emit custom event `auditlog:cancelled`

## ⚠️ Lưu ý

1. **Không thể hủy audit log đã hoàn thành**: Chỉ có thể hủy audit log ở trạng thái `PENDING` hoặc `IN_PROGRESS`
2. **Lý do hủy bắt buộc**: Phải cung cấp `cancelReason` (5-500 ký tự)
3. **Socket notifications**: Chỉ gửi cho users đang online. Offline users sẽ nhận notification khi reconnect (nếu có queue system)
4. **Permissions**: Cần quyền `AUDIT:UPDATE` để hủy audit log
5. **Validation**: Hệ thống sẽ validate:
   - Format của audit ID
   - Format của user ID
   - Quyền của user
   - Trạng thái của audit log

## 🧪 Testing

### Test với cURL

```bash
# Admin hủy audit log
curl -X POST http://localhost:3000/api/audit/68a67f1a89ba03c434bc0364/cancel \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "cancelReason": "Nhiệm vụ không còn cần thiết do đã được xử lý bằng cách khác"
  }'

# Staff hủy audit log
curl -X POST http://localhost:3000/api/audit/68a67f1a89ba03c434bc0364/cancel \
  -H "Authorization: Bearer <staff_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "cancelReason": "Không thể thực hiện do thiếu thiết bị cần thiết"
  }'
```

### Test với Postman/Thunder Client

1. **Setup:**
   - Method: `POST`
   - URL: `http://localhost:3000/api/audit/{auditId}/cancel`
   - Headers:
     - `Authorization: Bearer <token>`
     - `Content-Type: application/json`
   - Body (JSON):
     ```json
     {
       "cancelReason": "Lý do hủy bỏ nhiệm vụ"
     }
     ```

2. **Test Cases:**
   - ✅ Admin hủy audit log PENDING
   - ✅ Staff được giao hủy audit log PENDING
   - ✅ Staff được giao hủy audit log IN_PROGRESS
   - ❌ Staff không được giao hủy audit log (403)
   - ❌ Hủy audit log đã COMPLETED (400)
   - ❌ Hủy audit log đã CANCELLED (400)
   - ❌ Không có cancelReason (400)

## 📚 Tài liệu liên quan

- [Audit Log API Documentation](./README.md)
- [WebSocket API Documentation](../../shared/events/WEBSOCKET_API.md)
- [Critical Report Notification](../../shared/events/CRITICAL_REPORT_NOTIFICATION.md)

## 🔗 API Endpoints liên quan

- `POST /api/audit` - Tạo audit log mới
- `GET /api/audit/:id` - Lấy chi tiết audit log
- `PATCH /api/audit/:id` - Cập nhật audit log
- `POST /api/audit/staff/accept-log/:auditId` - Staff nhận nhiệm vụ
- `POST /api/audit/staff/complete-log/:auditId` - Staff hoàn thành nhiệm vụ
- `DELETE /api/audit/:id` - Xóa audit log
