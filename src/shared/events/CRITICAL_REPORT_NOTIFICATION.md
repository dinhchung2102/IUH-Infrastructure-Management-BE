# Critical Report Notification - Socket.IO

## 📋 Tổng quan

Tính năng này tự động gửi thông báo real-time qua WebSocket cho tất cả nhân viên và admin khi có báo cáo được phân loại là **khẩn cấp (CRITICAL)**.

## 🎯 Mục đích

Khi một báo cáo được tạo và được AI hoặc người dùng phân loại với priority `CRITICAL`, hệ thống sẽ tự động:

- Gửi socket notification cho tất cả nhân viên (STAFF)
- Gửi socket notification cho tất cả admin (ADMIN, CAMPUS_ADMIN)
- Đảm bảo các báo cáo khẩn cấp được xử lý nhanh chóng

## 🔌 Kết nối WebSocket

### Endpoint

```
ws://localhost:3000/events
```

hoặc production:

```
wss://api.iuh.nagentech.com/events
```

### Kết nối với Authentication

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/events', {
  query: {
    userId: 'user-id-here', // ID của user (từ JWT token)
    accountId: 'account-id-here', // ID của account
    role: 'STAFF', // Role của user: ADMIN, CAMPUS_ADMIN, STAFF, etc.
  },
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});
```

## 📨 Nhận Notification

### Event Name

```
notification
```

### Cấu trúc Payload

```typescript
interface CriticalReportNotification {
  type: 'error'; // Luôn là 'error' cho báo cáo khẩn cấp
  title: string; // "Báo cáo khẩn cấp mới"
  message: string; // Mô tả ngắn gọn của báo cáo (100 ký tự đầu)
  data: {
    reportId: string; // ID của báo cáo
    assetId?: string; // ID của thiết bị (nếu có)
    assetName?: string; // Tên thiết bị
    priority: 'CRITICAL'; // Độ ưu tiên
    reportType: string; // Loại báo cáo: MAINTENANCE, DAMAGED, LOST, etc.
    description: string; // Mô tả đầy đủ của báo cáo
    createdAt: Date; // Thời gian tạo báo cáo
    createdBy?: string; // ID người tạo
    createdByName?: string; // Tên người tạo
  };
  timestamp: Date; // Thời gian gửi notification
}
```

### Ví dụ Payload

```json
{
  "type": "error",
  "title": "Báo cáo khẩn cấp mới",
  "message": "Có báo cáo khẩn cấp mới được tạo: Máy lạnh phòng A101 bị hỏng, không hoạt động, nhiệt độ phòng tăng cao...",
  "data": {
    "reportId": "68a67f1a89ba03c434bc0364",
    "assetId": "6933aa3785705ceb03238654",
    "assetName": "Máy lạnh phòng A101",
    "priority": "CRITICAL",
    "reportType": "DAMAGED",
    "description": "Máy lạnh phòng A101 bị hỏng, không hoạt động, nhiệt độ phòng tăng cao, cần xử lý ngay",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "createdBy": "693bc0b79512dd56dc47baf9",
    "createdByName": "Nguyễn Văn A"
  },
  "timestamp": "2025-01-15T10:30:05.123Z"
}
```

## 💻 Ví dụ Code Frontend

### React/TypeScript

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface CriticalReportNotification {
  type: 'error';
  title: string;
  message: string;
  data: {
    reportId: string;
    assetId?: string;
    assetName?: string;
    priority: 'CRITICAL';
    reportType: string;
    description: string;
    createdAt: Date;
    createdBy?: string;
    createdByName?: string;
  };
  timestamp: Date;
}

export const useCriticalReportNotification = (
  userId: string,
  accountId: string,
  role: string,
) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<
    CriticalReportNotification[]
  >([]);

  useEffect(() => {
    // Kết nối WebSocket
    const newSocket = io('http://localhost:3000/events', {
      query: {
        userId,
        accountId,
        role,
      },
      transports: ['websocket'],
      reconnection: true,
    });

    // Lắng nghe notification
    newSocket.on('notification', (data: CriticalReportNotification) => {
      // Chỉ xử lý notification cho báo cáo khẩn cấp
      if (data.type === 'error' && data.data?.priority === 'CRITICAL') {
        setNotifications((prev) => [data, ...prev]);

        // Hiển thị thông báo (toast, alert, etc.)
        showNotification(data);
      }
    });

    // Xử lý kết nối
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.close();
    };
  }, [userId, accountId, role]);

  return { socket, notifications };
};

// Hàm hiển thị thông báo
const showNotification = (notification: CriticalReportNotification) => {
  // Sử dụng thư viện toast notification (ví dụ: react-toastify, sonner, etc.)
  // hoặc custom notification component
  // Ví dụ với react-toastify:
  // toast.error(notification.title, {
  //   description: notification.message,
  //   duration: 10000, // 10 giây
  //   action: {
  //     label: 'Xem chi tiết',
  //     onClick: () => navigate(`/reports/${notification.data.reportId}`),
  //   },
  // });
};
```

### Vue 3/TypeScript

```typescript
import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';

interface CriticalReportNotification {
  type: 'error';
  title: string;
  message: string;
  data: {
    reportId: string;
    assetId?: string;
    assetName?: string;
    priority: 'CRITICAL';
    reportType: string;
    description: string;
    createdAt: Date;
    createdBy?: string;
    createdByName?: string;
  };
  timestamp: Date;
}

export const useCriticalReportNotification = (
  userId: string,
  accountId: string,
  role: string,
) => {
  const socket = ref<Socket | null>(null);
  const notifications = ref<CriticalReportNotification[]>([]);

  onMounted(() => {
    // Kết nối WebSocket
    const newSocket = io('http://localhost:3000/events', {
      query: {
        userId,
        accountId,
        role,
      },
      transports: ['websocket'],
      reconnection: true,
    });

    // Lắng nghe notification
    newSocket.on('notification', (data: CriticalReportNotification) => {
      if (data.type === 'error' && data.data?.priority === 'CRITICAL') {
        notifications.value.unshift(data);
        showNotification(data);
      }
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socket.value = newSocket;
  });

  onUnmounted(() => {
    if (socket.value) {
      socket.value.close();
    }
  });

  return { socket, notifications };
};
```

### Vanilla JavaScript

```javascript
// Kết nối WebSocket
const socket = io('http://localhost:3000/events', {
  query: {
    userId: 'user-id-here',
    accountId: 'account-id-here',
    role: 'STAFF',
  },
  transports: ['websocket'],
  reconnection: true,
});

// Lắng nghe notification
socket.on('notification', (data) => {
  // Kiểm tra nếu là báo cáo khẩn cấp
  if (data.type === 'error' && data.data?.priority === 'CRITICAL') {
    console.log('Critical report notification:', data);

    // Hiển thị thông báo
    showNotification(data);

    // Có thể redirect đến trang chi tiết báo cáo
    // window.location.href = `/reports/${data.data.reportId}`;
  }
});

// Xử lý kết nối
socket.on('connect', () => {
  console.log('WebSocket connected');
});

socket.on('disconnect', () => {
  console.log('WebSocket disconnected');
});

// Hàm hiển thị thông báo
function showNotification(notification) {
  // Sử dụng thư viện notification hoặc custom
  // Ví dụ: toastr, sweetalert2, hoặc custom modal

  // Ví dụ với browser notification API
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.message,
      icon: '/icon-critical.png',
      badge: '/badge-critical.png',
      tag: notification.data.reportId,
      requireInteraction: true,
    });
  }
}

// Yêu cầu quyền hiển thị notification
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
```

## 🎨 UI/UX Gợi ý

### Hiển thị Notification

1. **Toast Notification** (khuyến nghị)
   - Màu đỏ/cảnh báo
   - Icon cảnh báo
   - Hiển thị 10-15 giây hoặc cho đến khi user đóng
   - Có nút "Xem chi tiết" để navigate đến trang báo cáo

2. **Badge/Indicator**
   - Hiển thị số lượng báo cáo khẩn cấp chưa xem
   - Đặt ở header/navbar
   - Màu đỏ nổi bật

3. **Sound Alert** (tùy chọn)
   - Phát âm thanh cảnh báo khi nhận notification
   - Chỉ phát một lần để tránh làm phiền

4. **Browser Notification**
   - Sử dụng Browser Notification API
   - Hiển thị ngay cả khi tab không active

### Ví dụ Component (React)

```typescript
import { toast } from 'sonner'; // hoặc react-toastify
import { useNavigate } from 'react-router-dom';

const handleCriticalReportNotification = (
  notification: CriticalReportNotification,
) => {
  const navigate = useNavigate();

  toast.error(notification.title, {
    description: notification.message,
    duration: 15000, // 15 giây
    action: {
      label: 'Xem chi tiết',
      onClick: () => navigate(`/reports/${notification.data.reportId}`),
    },
    icon: '🚨',
  });

  // Cập nhật badge số lượng báo cáo khẩn cấp
  updateCriticalReportBadge();
};
```

## 🔍 Lọc Notification

Chỉ xử lý notification cho báo cáo khẩn cấp:

```typescript
socket.on('notification', (data) => {
  // Kiểm tra type và priority
  if (data.type === 'error' && data.data?.priority === 'CRITICAL') {
    // Xử lý notification
  }
});
```

## 📱 Mobile App (React Native)

```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/events', {
  query: {
    userId: user.id,
    accountId: account.id,
    role: user.role,
  },
  transports: ['websocket'],
});

socket.on('notification', (data) => {
  if (data.type === 'error' && data.data?.priority === 'CRITICAL') {
    // Hiển thị local notification
    PushNotification.localNotification({
      title: data.title,
      message: data.message,
      priority: 'high',
      soundName: 'critical_alert.mp3',
      userInfo: {
        reportId: data.data.reportId,
      },
    });
  }
});
```

## ⚠️ Lưu ý

1. **Reconnection**: Socket.IO tự động reconnect nếu mất kết nối
2. **Offline Queue**: Nếu user offline khi notification được gửi, notification sẽ được queue và gửi khi user reconnect
3. **Multiple Tabs**: Mỗi tab sẽ có một socket connection riêng
4. **Authentication**: Đảm bảo truyền đúng `userId`, `accountId`, và `role` trong query params
5. **Production URL**: Thay đổi URL WebSocket khi deploy production

## 🧪 Testing

### Test với Postman/Thunder Client

Không thể test trực tiếp qua HTTP, nhưng có thể test bằng cách:

1. Tạo một báo cáo với priority `CRITICAL` qua API
2. Kiểm tra xem socket có nhận được notification không

### Test với Browser Console

```javascript
// Mở browser console và chạy:
const socket = io('http://localhost:3000/events', {
  query: {
    userId: 'your-user-id',
    accountId: 'your-account-id',
    role: 'STAFF',
  },
});

socket.on('notification', (data) => {
  console.log('Received notification:', data);
});
```

## 📚 Tài liệu liên quan

- [WebSocket API Documentation](./WEBSOCKET_API.md)
- [Events Module README](./README.md)

## 🔗 API Endpoints liên quan

- `POST /api/report` - Tạo báo cáo (có thể set priority CRITICAL)
- `GET /api/report/:id` - Lấy chi tiết báo cáo
- `PATCH /api/report/:id/status` - Cập nhật trạng thái báo cáo
