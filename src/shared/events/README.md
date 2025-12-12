# Events Module - WebSocket/Socket.IO

Module WebSocket có thể tái sử dụng cho ứng dụng NestJS, cung cấp khả năng giao tiếp real-time giữa server và client.

## ✨ Tính năng

- ✅ WebSocket Gateway với Socket.IO
- ✅ Service có thể inject và sử dụng ở bất kỳ đâu
- ✅ Hỗ trợ Rooms để group clients
- ✅ Notifications system
- ✅ Real-time updates
- ✅ Client tracking (online/offline status)
- ✅ Custom events
- ✅ CORS configuration tự động
- ✅ TypeScript interfaces đầy đủ
- ✅ Error handling tốt

## 📦 Cài đặt

Module này đã được cài đặt và cấu hình sẵn trong dự án. Các dependencies đã bao gồm:

```json
{
  "@nestjs/websockets": "latest",
  "@nestjs/platform-socket.io": "latest",
  "socket.io": "latest"
}
```

## 🚀 Quick Start

### Backend (NestJS)

```typescript
import { Injectable } from '@nestjs/common';
import { EventsService } from '@/shared/events';

@Injectable()
export class MyService {
  constructor(private readonly eventsService: EventsService) {}

  sendNotification(userId: string) {
    this.eventsService.sendNotificationToUser(userId, {
      title: 'Hello',
      message: 'Welcome to the app!',
      type: 'info',
    });
  }
}
```

### Frontend (JavaScript/TypeScript)

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/events', {
  query: {
    userId: 'user123',
    accountId: 'acc456',
    role: 'admin',
  },
});

socket.on('notification', (data) => {
  console.log('Notification:', data);
});
```

## 📚 Tài liệu

- **[WEBSOCKET_API.md](./WEBSOCKET_API.md)** - 📖 API Documentation đầy đủ cho Frontend Developer

## 🏗️ Cấu trúc

```
src/shared/events/
├── dto/                           # Data Transfer Objects
│   ├── socket-event.dto.ts
│   └── index.ts
├── interfaces/                    # TypeScript Interfaces
│   ├── socket-client.interface.ts
│   ├── event-payload.interface.ts
│   └── index.ts
├── events.gateway.ts              # WebSocket Gateway
├── events.service.ts              # Events Service (with queue system)
├── events.module.ts               # Module definition
├── index.ts                       # Exports
├── README.md                      # File này
└── WEBSOCKET_API.md              # API Documentation
```

## 🔌 WebSocket Endpoint

```
ws://localhost:3000/events
```

hoặc production:

```
wss://your-domain.com/events
```

## 📡 Events có sẵn

### Server → Client Events

| Event                | Description                 |
| -------------------- | --------------------------- |
| `connected`          | Xác nhận kết nối thành công |
| `notification`       | Nhận notification           |
| `update`             | Nhận data update            |
| `roomMessage`        | Nhận message từ room        |
| `clientConnected`    | Có client mới kết nối       |
| `clientDisconnected` | Có client ngắt kết nối      |
| `error`              | Nhận error message          |

### Client → Server Events

| Event              | Description          | Payload                             |
| ------------------ | -------------------- | ----------------------------------- |
| `joinRoom`         | Join một room        | `{ room: string }`                  |
| `leaveRoom`        | Leave một room       | `{ room: string }`                  |
| `ping`             | Health check         | -                                   |
| `getClientsCount`  | Lấy số lượng clients | -                                   |
| `messageToRoom`    | Gửi message tới room | `{ room: string, message: string }` |
| `sendNotification` | Gửi notification     | `NotificationDto`                   |

## 🎯 Use Cases phổ biến

### 1. ⭐ Staff Login & Audit Log Notifications (Đã tích hợp)

**Backend (AuthService):**

```typescript
// Khi staff đăng nhập thành công
this.eventsService.sendNotificationToUser(account._id.toString(), {
  title: 'Đăng nhập thành công',
  message: `Chào mừng ${account.fullName} quay trở lại!`,
  type: 'success',
});
```

**Backend (AuditService):**

```typescript
// Khi tạo audit log mới, notify các staff được giao
for (const staffId of createAuditLogDto.staffs) {
  this.eventsService.sendNotificationToUser(staffId, {
    title: 'Nhiệm vụ kiểm tra mới',
    message: `Bạn đã được giao nhiệm vụ: ${createAuditLogDto.subject}`,
    type: 'info',
    data: {
      auditLogId: savedAuditLog._id.toString(),
      subject: createAuditLogDto.subject,
      status: savedAuditLog.status,
    },
  });
}
```

**Frontend:**

```javascript
// Sau khi login, khởi tạo WebSocket
const socket = io('http://localhost:3000/events', {
  query: {
    userId: loginResponse.account._id,
    accountId: loginResponse.account._id,
    role: loginResponse.account.role,
  },
});

// Listen for notifications
socket.on('notification', (notification) => {
  if (notification.data?.auditLogId) {
    // Có audit log mới được giao
    showToast(notification.title, notification.message);
    navigateToAuditLog(notification.data.auditLogId);
  }
});
```

📖 **Xem chi tiết**: [WEBSOCKET_API.md](./WEBSOCKET_API.md)

### 2. Real-time notifications

```typescript
this.eventsService.sendNotificationToUser(userId, {
  title: 'New message',
  message: 'You have a new message',
  type: 'info',
});
```

### 3. Data synchronization

```typescript
this.eventsService.emitUpdate({
  entity: 'asset',
  action: 'updated',
  data: updatedAsset,
});
```

### 4. Room-based communication

```typescript
// Backend
this.eventsService.emitToRoom('campus-1', 'newReport', reportData);

// Frontend
socket.emit('joinRoom', { room: 'campus-1' });
socket.on('newReport', (data) => {
  console.log('New report:', data);
});
```

### 5. Online status tracking

```typescript
const isOnline = this.eventsService.isUserConnected(userId);
const clients = this.eventsService.getClientsByUserId(userId);
```

## ⚙️ Configuration

### CORS

CORS được cấu hình tự động từ biến môi trường:

```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://iuh.nagentech.com
```

### Authentication

Hiện tại authentication thông qua query parameters:

```javascript
const socket = io('http://localhost:3000/events', {
  query: {
    userId: 'user123',
    accountId: 'acc456',
    role: 'admin',
  },
});
```

Bạn có thể mở rộng để sử dụng JWT token bằng cách modify `events.gateway.ts`:

```typescript
handleConnection(client: AuthenticatedSocket): void {
  const token = client.handshake.auth.token;
  // Verify token và extract user info
}
```

## 🧪 Testing

### Test với Postman/Insomnia

1. Tạo WebSocket Request
2. URL: `ws://localhost:3000/events?userId=test123&role=admin`
3. Connect và test các events

### Test trong code

```typescript
// Unit test
describe('EventsService', () => {
  it('should emit notification', () => {
    const spy = jest.spyOn(eventsService, 'emitToUser');
    eventsService.sendNotificationToUser('user123', {
      title: 'Test',
      message: 'Test message',
      type: 'info',
    });
    expect(spy).toHaveBeenCalled();
  });
});
```

## 🔧 Troubleshooting

### Client không kết nối được

1. Kiểm tra CORS settings
2. Verify WebSocket adapter đã được cấu hình trong `main.ts`
3. Check firewall/network settings

### Events không nhận được

1. Verify client đã join room đúng
2. Check userId được set chính xác
3. Xem server logs để debug

### Performance issues

1. Sử dụng rooms thay vì broadcast toàn bộ
2. Giảm kích thước payload
3. Consider Redis adapter cho scaling

## 🚀 Production Deployment

### 1. Environment Variables

```env
NODE_ENV=production
ALLOWED_ORIGINS=https://your-domain.com
PORT=3000
```

### 2. Scaling với Redis (Optional)

Để scale horizontally với nhiều instances, sử dụng Redis adapter:

```typescript
// Install: npm install @socket.io/redis-adapter redis
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

// In main.ts
const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

const redisAdapter = createAdapter(pubClient, subClient);
app.useWebSocketAdapter(new IoAdapter(app));
```

## 📝 License

Internal use only for IUH Infrastructure Management project.

## 👥 Support

Nếu có câu hỏi hoặc gặp vấn đề:

1. Đọc [WEBSOCKET_API.md](./WEBSOCKET_API.md) để xem API đầy đủ
2. Check server logs để debug
3. Check browser/React Native console logs

## ✨ Tính năng đã tích hợp

- ✅ WebSocket Gateway với Socket.IO
- ✅ Notification queue system (tự động gửi khi client connect)
- ✅ Login success notification
- ✅ Audit log assignment notification (cả từ `/api/audit` và `/api/report/approve`)
- ✅ **Critical Report Notification** - Thông báo báo cáo khẩn cấp với thông tin vị trí đầy đủ
- ✅ Real-time data updates
- ✅ Room management
- ✅ Client tracking
- ✅ Auto-reconnection support

## 📋 Changelog

### Critical Report Notification với Location Information

**Version:** 2025-01-15

**Thay đổi:**
- ✅ Thêm thông tin vị trí (location) vào notification payload cho báo cáo khẩn cấp
- ✅ Location bao gồm: Campus (Cơ sở), Building (Tòa nhà), Zone/Area (Khu vực)
- ✅ Thêm `fullPath` - đường dẫn đầy đủ dạng "Cơ sở > Tòa nhà > Khu vực"
- ✅ Message notification tự động bao gồm vị trí để dễ nhận biết

**Chi tiết:**
- Khi báo cáo có priority `CRITICAL` được tạo, hệ thống sẽ:
  1. Populate đầy đủ thông tin location từ asset (zone/area → building → campus)
  2. Gửi socket notification cho tất cả staff và admin
  3. Notification payload bao gồm object `location` với:
     - `campus`: { id, name }
     - `building`: { id, name }
     - `zone` hoặc `area`: { id, name } (tùy asset thuộc zone hay area)
     - `fullPath`: String đầy đủ để hiển thị

**Tài liệu:**
- Xem chi tiết tại: [CRITICAL_REPORT_NOTIFICATION.md](./CRITICAL_REPORT_NOTIFICATION.md)
