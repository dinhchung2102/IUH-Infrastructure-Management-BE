# Events Module - WebSocket Usage Guide

## Tổng quan

Module Events cung cấp chức năng WebSocket/Socket.IO có thể tái sử dụng cho ứng dụng. Module này đã được đánh dấu là `@Global()` nên có thể sử dụng ở bất kỳ đâu mà không cần import lại.

## Cấu trúc

```
src/shared/events/
├── dto/                        # Data Transfer Objects
│   └── socket-event.dto.ts    # DTOs cho các events
├── interfaces/                # Interfaces
│   ├── socket-client.interface.ts
│   └── event-payload.interface.ts
├── events.gateway.ts          # WebSocket Gateway
├── events.service.ts          # Service xử lý logic
├── events.module.ts           # Module definition
└── index.ts                   # Export tất cả
```

## Kết nối từ Client

### JavaScript/TypeScript Client

```javascript
import { io } from 'socket.io-client';

// Connect to WebSocket server
const socket = io('http://localhost:3000/events', {
  query: {
    userId: 'user123',
    accountId: 'acc456',
    role: 'admin',
  },
  transports: ['websocket'],
  withCredentials: true,
});

// Listen for connection
socket.on('connected', (data) => {
  console.log('Connected:', data);
  // { message: 'Successfully connected...', socketId: '...', timestamp: '...' }
});

// Handle connection error
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

## Các Events có sẵn

### 1. Join Room

```javascript
// Join a room
socket.emit('joinRoom', { room: 'room-name' });

// Listen for join confirmation
socket.on('joinedRoom', (data) => {
  console.log('Joined room:', data);
});
```

### 2. Leave Room

```javascript
// Leave a room
socket.emit('leaveRoom', { room: 'room-name' });

// Listen for leave confirmation
socket.on('leftRoom', (data) => {
  console.log('Left room:', data);
});
```

### 3. Ping/Pong (Health Check)

```javascript
// Send ping
socket.emit('ping');

// Receive pong
socket.on('pong', (data) => {
  console.log('Pong received:', data.timestamp);
});
```

### 4. Get Connected Clients Count

```javascript
// Request clients count
socket.emit('getClientsCount');

// Receive count
socket.on('clientsCount', (data) => {
  console.log('Connected clients:', data.count);
});
```

### 5. Send Message to Room

```javascript
// Send message to a room
socket.emit('messageToRoom', {
  room: 'room-name',
  message: 'Hello everyone!',
});

// Listen for room messages
socket.on('roomMessage', (data) => {
  console.log('Message from:', data.from);
  console.log('Message:', data.message);
});
```

### 6. Notifications

```javascript
// Send notification (admin only)
socket.emit('sendNotification', {
  title: 'System Update',
  message: 'System will be maintained at 2 AM',
  type: 'info',
  data: { maintenanceTime: '2025-01-01T02:00:00Z' },
});

// Listen for notifications
socket.on('notification', (data) => {
  console.log('Notification:', data.title, data.message);
});
```

### 7. Global Events

```javascript
// Listen when a client connects
socket.on('clientConnected', (data) => {
  console.log('Total clients:', data.totalClients);
});

// Listen when a client disconnects
socket.on('clientDisconnected', (data) => {
  console.log('Total clients:', data.totalClients);
});

// Listen for updates
socket.on('update', (data) => {
  console.log('Entity updated:', data.entity, data.action);
  console.log('Data:', data.data);
});
```

## Sử dụng trong Backend (NestJS)

### 1. Inject EventsService

```typescript
import { Injectable } from '@nestjs/common';
import { EventsService } from '@/shared/events';

@Injectable()
export class YourService {
  constructor(private readonly eventsService: EventsService) {}

  async someMethod() {
    // Your logic here
  }
}
```

### 2. Gửi notification cho user cụ thể

```typescript
// Send notification to specific user
this.eventsService.sendNotificationToUser('user123', {
  title: 'New Message',
  message: 'You have a new message',
  type: 'info',
  data: { messageId: 'msg456' },
});
```

### 3. Broadcast notification cho tất cả

```typescript
// Broadcast to all connected clients
this.eventsService.broadcastNotification({
  title: 'System Maintenance',
  message: 'System will be down for maintenance',
  type: 'warning',
});
```

### 4. Gửi event cho room cụ thể

```typescript
// Emit to specific room
this.eventsService.emitToRoom('room-admins', 'adminNotification', {
  message: 'New report available',
  reportId: 'report123',
});
```

### 5. Emit update event

```typescript
// Notify clients about data updates
this.eventsService.emitUpdate({
  entity: 'asset',
  action: 'created',
  data: {
    id: 'asset123',
    name: 'New Asset',
    // ... other fields
  },
});
```

### 6. Kiểm tra user có đang online không

```typescript
const isOnline = this.eventsService.isUserConnected('user123');
if (isOnline) {
  console.log('User is online');
}
```

### 7. Lấy thông tin các client đang kết nối

```typescript
// Get all connected clients
const clients = this.eventsService.getAllClients();

// Get clients by userId
const userClients = this.eventsService.getClientsByUserId('user123');

// Get total count
const count = this.eventsService.getConnectedClientsCount();
```

## Ví dụ thực tế

### Case 1: Gửi thông báo khi có báo cáo mới

```typescript
@Injectable()
export class ReportService {
  constructor(private readonly eventsService: EventsService) {}

  async createReport(createReportDto: CreateReportDto, userId: string) {
    const report = await this.reportModel.create({
      ...createReportDto,
      createdBy: userId,
    });

    // Notify all users in the room
    this.eventsService.emitToRoom(`campus-${report.campusId}`, 'newReport', {
      reportId: report._id,
      title: report.title,
      createdBy: userId,
    });

    // Notify specific user (admin)
    this.eventsService.sendNotificationToUser('admin-user-id', {
      title: 'Báo cáo mới',
      message: `Có báo cáo mới: ${report.title}`,
      type: 'info',
      data: { reportId: report._id },
    });

    return report;
  }
}
```

### Case 2: Real-time asset tracking

```typescript
@Injectable()
export class AssetsService {
  constructor(private readonly eventsService: EventsService) {}

  async updateAssetStatus(assetId: string, status: string) {
    const asset = await this.assetModel.findByIdAndUpdate(
      assetId,
      { status },
      { new: true },
    );

    // Broadcast update to all clients
    this.eventsService.emitUpdate({
      entity: 'asset',
      action: 'updated',
      data: {
        id: asset._id,
        status: asset.status,
        name: asset.name,
      },
    });

    return asset;
  }
}
```

### Case 3: Online users tracking

```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('online')
  getOnlineUsers() {
    const clients = this.eventsService.getAllClients();

    // Group by userId
    const onlineUsers = [
      ...new Set(clients.map((c) => c.userId).filter(Boolean)),
    ];

    return {
      count: onlineUsers.length,
      users: onlineUsers,
    };
  }

  @Get('online/:userId')
  checkUserOnline(@Param('userId') userId: string) {
    return {
      userId,
      isOnline: this.eventsService.isUserConnected(userId),
    };
  }
}
```

## Testing với Postman/Insomnia

1. Tạo WebSocket connection mới
2. URL: `ws://localhost:3000/events` hoặc `wss://domain.com/events`
3. Add query parameters:
   - userId: your-user-id
   - accountId: your-account-id
   - role: admin

## Lưu ý

1. **CORS**: CORS đã được cấu hình tự động từ biến môi trường `ALLOWED_ORIGINS`
2. **Authentication**: Hiện tại authentication được thực hiện qua query params. Bạn có thể mở rộng bằng cách sử dụng JWT token
3. **Rooms**: Sử dụng rooms để group clients theo campus, department, role, v.v.
4. **Error Handling**: Tất cả errors sẽ được emit về client qua event `error`
5. **Logging**: Tất cả connections/disconnections được log tự động

## Performance Tips

1. Sử dụng rooms thay vì broadcast toàn bộ khi có thể
2. Limit số lượng data gửi trong mỗi event
3. Sử dụng `emitToUser` thay vì loop qua các sockets
4. Cleanup rooms khi không dùng nữa

## Troubleshooting

### Client không kết nối được

- Kiểm tra CORS configuration
- Kiểm tra network firewall
- Đảm bảo server đã start đúng cổng

### Events không nhận được

- Kiểm tra room membership
- Verify userId được set đúng
- Check server logs

### High latency

- Reduce payload size
- Use rooms instead of broadcast
- Consider using Redis adapter for scaling
