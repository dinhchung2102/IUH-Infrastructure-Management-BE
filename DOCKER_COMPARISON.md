# So sánh Dockerfile: Example vs Project hiện tại

## Khác biệt chính

### Example Project (Express.js)

- **Đơn giản**: Không có build stage, chạy trực tiếp `node server.js`
- **USER node từ đầu**: Không cần entrypoint script phức tạp
- **network_mode: host**: Dễ kết nối với services trên host
- **Bind mount trực tiếp**: `/var/www/uploads/kiosk-server` và `/var/log/kiosk-server`

### Project hiện tại (NestJS)

- **Multi-stage build**: Build TypeScript → JavaScript
- **Entrypoint script**: Fix permissions rồi mới switch USER
- **Docker network**: Dùng bridge network
- **Bind mount**: `./uploads` và `./logs` từ host

## Lỗi phát hiện

### 1. EXPOSE port sai

- **Hiện tại**: `EXPOSE 4890` (external port)
- **Đúng**: `EXPOSE 3000` (internal port trong container)
- **Lý do**: EXPOSE nên là port mà app chạy bên trong container, không phải port mapping

### 2. Healthcheck đúng

- Healthcheck dùng `localhost:3000` là đúng (port internal)

### 3. Có thể đơn giản hóa

- Example không cần entrypoint script vì USER node từ đầu
- Project hiện tại có thể đơn giản hóa nếu không cần fix permissions động

## Khuyến nghị

1. **Sửa EXPOSE**: `EXPOSE 3000` (port internal)
2. **Giữ nguyên healthcheck**: Đã đúng
3. **Có thể đơn giản hóa entrypoint**: Nếu permissions trên host đã đúng, có thể switch USER node sớm hơn
