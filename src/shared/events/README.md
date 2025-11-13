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

## 📚 Tài liệu chi tiết

- **[USAGE.md](./USAGE.md)** - Hướng dẫn sử dụng đầy đủ
- **[examples/backend-usage.example.ts](./examples/backend-usage.example.ts)** - Ví dụ sử dụng trong Backend
- **[examples/client-usage.example.js](./examples/client-usage.example.js)** - Ví dụ sử dụng trong Frontend

## 🏗️ Cấu trúc

```
src/shared/events/
├── dto/                           # Data Transfer Objects
│   ├── socket-event.dto.ts       # DTOs cho events
│   └── index.ts
├── interfaces/                    # TypeScript Interfaces
│   ├── socket-client.interface.ts
│   ├── event-payload.interface.ts
│   └── index.ts
├── examples/                      # Ví dụ code
│   ├── backend-usage.example.ts
│   └── client-usage.example.js
├── events.gateway.ts              # WebSocket Gateway
├── events.service.ts              # Events Service
├── events.module.ts               # Module definition
├── index.ts                       # Exports
├── README.md                      # File này
└── USAGE.md                       # Hướng dẫn chi tiết
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

### 1. Real-time notifications

```typescript
this.eventsService.sendNotificationToUser(userId, {
  title: 'New message',
  message: 'You have a new message',
  type: 'info',
});
```

### 2. Data synchronization

```typescript
this.eventsService.emitUpdate({
  entity: 'asset',
  action: 'updated',
  data: updatedAsset,
});
```

### 3. Room-based communication

```typescript
// Backend
this.eventsService.emitToRoom('campus-1', 'newReport', reportData);

// Frontend
socket.emit('joinRoom', { room: 'campus-1' });
socket.on('newReport', (data) => {
  console.log('New report:', data);
});
```

### 4. Online status tracking

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

Nếu có câu hỏi hoặc gặp vấn đề, vui lòng:

1. Đọc file USAGE.md
2. Xem examples trong thư mục examples/
3. Check server logs để debug

## 🔄 Updates

- **v1.0.0** (2025-01-13): Initial release
  - WebSocket Gateway
  - Events Service
  - Full TypeScript support
  - Documentation và examples
