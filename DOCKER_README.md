# Hướng dẫn Build và Chạy Docker

Hướng dẫn chi tiết để build và chạy ứng dụng IUH Infrastructure Management Backend với Docker.

## Yêu cầu

- Docker Engine >= 20.10
- Docker Compose >= 2.0
- File `.env` đã được cấu hình đầy đủ

## Bước 1: Chuẩn bị file .env

Tạo file `.env` trong thư mục gốc của project với các biến môi trường cần thiết:

```env
# Database
MONGO_URI=mongodb://localhost:27017/iuh-infrastructure

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=30d

# Redis (cấu hình theo môi trường của bạn)
REDIS_HOST=redis  # Tên container Redis hoặc IP
REDIS_PORT=6379
REDIS_PASSWORD=  # Để trống nếu không có password

# Qdrant (sẽ được override bởi docker-compose)
QDRANT_URL=http://qdrant:6333

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_PORT=587

# AI Service Configuration
AI=openai  # hoặc 'gemini'
OPENAI_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
# Hoặc nếu dùng Gemini:
# GEMINI_KEY=your-gemini-api-key
# GEMINI_CHAT_MODEL=gemini-2.0-flash

# N8N Webhook (cho automation)
N8N_WEBHOOK_SECRET=your-n8n-webhook-secret

# Upload Directory (optional)
UPLOADS_DIR=/app/uploads  # Trong Docker container

# Port (optional, mặc định 3000)
PORT=3000

# Node Environment
NODE_ENV=production
```

**Lưu ý quan trọng về Redis:**

- Nếu Redis chạy trong container riêng: dùng tên container hoặc IP của container
- Nếu Redis trên host machine: dùng `host.docker.internal` (Linux/Mac) hoặc IP của host (Windows)
- Xem thêm chi tiết trong [docs/DOCKER_REDIS_SETUP.md](./docs/DOCKER_REDIS_SETUP.md)

## Bước 2: Tạo thư mục cần thiết

Tạo các thư mục cho uploads và logs trên host machine:

```bash
mkdir -p uploads logs
chmod 755 uploads logs
```

## Bước 3: Build Docker Image

### Cách 1: Build với docker-compose (Khuyến nghị)

```bash
# Build image
docker-compose build

# Hoặc build lại từ đầu (no cache)
docker-compose build --no-cache
```

### Cách 2: Build trực tiếp với Docker

```bash
# Build image
docker build -t iuh-csvc-api:latest .

# Hoặc với tag cụ thể
docker build -t iuh-csvc-api:v1.0.0 .
```

## Bước 4: Chạy với Docker Compose

### Khởi động tất cả services

```bash
# Chạy ở foreground (xem logs)
docker-compose up

# Chạy ở background (detached mode)
docker-compose up -d
```

### Chỉ chạy app service (nếu Qdrant đã chạy)

```bash
docker-compose up -d app
```

### Xem logs

```bash
# Xem logs của tất cả services
docker-compose logs -f

# Xem logs của app service
docker-compose logs -f app

# Xem logs của Qdrant
docker-compose logs -f qdrant
```

## Bước 5: Kiểm tra ứng dụng

### Kiểm tra health check

```bash
# Từ host machine
curl http://localhost:3000/api/health

# Hoặc từ browser
# http://localhost:3000/api/health
```

### Kiểm tra container đang chạy

```bash
docker-compose ps
```

### Kiểm tra logs

```bash
# Xem logs realtime
docker-compose logs -f app

# Xem logs của 100 dòng cuối
docker-compose logs --tail=100 app
```

## Các lệnh Docker Compose thường dùng

### Dừng services

```bash
# Dừng tất cả services
docker-compose stop

# Dừng và xóa containers
docker-compose down

# Dừng, xóa containers và volumes (CẨN THẬN!)
docker-compose down -v
```

### Restart services

```bash
# Restart tất cả services
docker-compose restart

# Restart chỉ app service
docker-compose restart app
```

### Rebuild và restart

```bash
# Rebuild và restart
docker-compose up -d --build
```

### Xóa và rebuild từ đầu

```bash
# Dừng và xóa containers
docker-compose down

# Xóa images
docker-compose rm -f

# Rebuild
docker-compose build --no-cache

# Chạy lại
docker-compose up -d
```

## Chạy với Docker trực tiếp (không dùng docker-compose)

Nếu bạn muốn chạy container trực tiếp với Docker:

```bash
# Build image
docker build -t iuh-csvc-api:latest .

# Chạy container
docker run -d \
  --name iuh-csvc-api \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/logs:/app/logs \
  --network iuh-network \
  iuh-csvc-api:latest
```

**Lưu ý:** Cần tạo network trước:

```bash
docker network create iuh-network
```

## Troubleshooting

### Lỗi: "Cannot connect to Redis"

1. Kiểm tra Redis container đang chạy:

```bash
docker ps | grep redis
```

2. Kiểm tra REDIS_HOST trong `.env`:

```bash
# Nếu Redis container tên là 'iuh-redis'
REDIS_HOST=iuh-redis

# Nếu Redis trên host machine
REDIS_HOST=host.docker.internal
```

3. Test kết nối từ container:

```bash
docker exec -it iuh-csvc-api sh
# Trong container
node -e "const redis = require('ioredis'); const client = new redis({host: process.env.REDIS_HOST, port: process.env.REDIS_PORT}); client.ping().then(r => console.log('OK:', r)).catch(e => console.error('Error:', e));"
```

Xem thêm: [docs/DOCKER_REDIS_SETUP.md](./docs/DOCKER_REDIS_SETUP.md)

### Lỗi: "Cannot create uploads directory"

1. Kiểm tra quyền thư mục trên host:

```bash
ls -la uploads
chmod 755 uploads
```

2. Kiểm tra quyền trong container:

```bash
docker exec -it iuh-csvc-api ls -la /app/uploads
```

3. Fix quyền trong container:

```bash
docker exec -it iuh-csvc-api sh
# Trong container (chạy với root)
chmod 755 /app/uploads
chown node:node /app/uploads
```

### Lỗi: "Cannot connect to MongoDB"

1. Kiểm tra MONGO_URI trong `.env`:

```env
# Nếu MongoDB trên host machine
MONGO_URI=mongodb://host.docker.internal:27017/iuh-infrastructure

# Nếu MongoDB trong container khác
MONGO_URI=mongodb://mongodb-container-name:27017/iuh-infrastructure

# Nếu MongoDB remote
MONGO_URI=mongodb://username:password@mongodb-host:27017/iuh-infrastructure
```

### Lỗi: "Email templates not found"

Kiểm tra email templates đã được copy vào container:

```bash
docker exec -it iuh-csvc-api ls -la /app/shared/email/templates
```

Nếu không có, rebuild image:

```bash
docker-compose build --no-cache
docker-compose up -d
```

### Xem logs chi tiết

```bash
# Xem tất cả logs
docker-compose logs app

# Xem logs với timestamp
docker-compose logs -t app

# Xem logs realtime
docker-compose logs -f app

# Xem logs của 50 dòng cuối
docker-compose logs --tail=50 app
```

### Vào trong container để debug

```bash
# Vào container
docker exec -it iuh-csvc-api sh

# Kiểm tra biến môi trường
env | grep REDIS
env | grep MONGO

# Kiểm tra file
ls -la /app
ls -la /app/uploads
ls -la /app/shared/email/templates
```

## Cấu trúc thư mục trong container

```
/app
├── dist/                    # Compiled JavaScript
├── shared/
│   └── email/
│       └── templates/       # Email templates
├── uploads/                 # Uploaded files (mounted from host)
├── logs/                    # Application logs (mounted from host)
└── node_modules/            # Production dependencies
```

## Volumes

Các volumes được mount từ host:

- `./uploads` → `/app/uploads` - Files được upload
- `./logs` → `/app/logs` - Application logs

## Networks

- `iuh-network` - Bridge network cho các services giao tiếp với nhau

## Ports

- `3000:3000` - Application port
- `6333:6333` - Qdrant REST API
- `6334:6334` - Qdrant gRPC

## Health Check

Container có health check tự động:

```bash
# Kiểm tra health status
docker inspect iuh-csvc-api | grep -A 10 Health
```

## Production Deployment

### 1. Tối ưu build

```bash
# Build với cache
docker-compose build

# Hoặc build không cache (đảm bảo clean build)
docker-compose build --no-cache
```

### 2. Security

- Đảm bảo file `.env` không được commit vào Git
- Sử dụng Docker secrets cho production
- Giới hạn quyền truy cập vào container

### 3. Monitoring

```bash
# Xem resource usage
docker stats iuh-csvc-api

# Xem container info
docker inspect iuh-csvc-api
```

### 4. Backup

```bash
# Backup uploads
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/

# Backup logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

## Tóm tắt các bước nhanh

```bash
# 1. Tạo file .env
cp .env.example .env
# Chỉnh sửa .env với các giá trị phù hợp

# 2. Tạo thư mục
mkdir -p uploads logs
chmod 755 uploads logs

# 3. Build và chạy
docker-compose up -d --build

# 4. Kiểm tra
curl http://localhost:3000/api/health

# 5. Xem logs
docker-compose logs -f app
```

## Liên kết hữu ích

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Redis Setup Guide](./docs/DOCKER_REDIS_SETUP.md)

## Hỗ trợ

Nếu gặp vấn đề, vui lòng:

1. Kiểm tra logs: `docker-compose logs app`
2. Kiểm tra file `.env` đã đúng chưa
3. Xem các troubleshooting ở trên
4. Kiểm tra network và ports có bị conflict không
