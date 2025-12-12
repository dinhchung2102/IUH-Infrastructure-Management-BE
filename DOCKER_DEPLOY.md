# Hướng dẫn Deploy với Docker trên VPS

## Bước 1: Chuẩn bị file .env

1. Tạo file `.env` từ template:
```bash
cp .env.example .env
```

2. Chỉnh sửa file `.env` với các giá trị thực tế:
```bash
nano .env
```

**Các biến quan trọng cần cấu hình:**

- `MONGO_URI`: Đường dẫn MongoDB (có thể là MongoDB local hoặc MongoDB Atlas)
- `JWT_SECRET` và `JWT_REFRESH_SECRET`: Keys bảo mật (nên dùng random string dài)
- `EMAIL_USER` và `EMAIL_PASSWORD`: Thông tin email Gmail (dùng App Password)
- `REDIS_HOST`: Nếu Redis chạy trong Docker thì dùng `redis`, nếu external thì dùng IP
- `REDIS_PORT`: Port Redis (trong Docker dùng `6379`, external có thể khác)
- `QDRANT_URL`: URL Qdrant (trong Docker dùng `http://qdrant:6333`)
- `GOOGLE_AI_API_KEY`: API key cho Google AI
- `UPLOADS_DIR`: Đường dẫn uploads trong container (`/var/www/uploads/iuh`)
- `ALLOWED_ORIGINS`: Các domain được phép CORS (phân cách bằng dấu phẩy)

## Bước 2: Đảm bảo có Docker và Docker Compose

```bash
# Kiểm tra Docker
docker --version
docker-compose --version

# Nếu chưa có, cài đặt:
# Ubuntu/Debian:
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
```

## Bước 3: Tạo thư mục uploads và logs (nếu chưa có)

```bash
# Tạo thư mục trên host (sẽ được mount vào container)
mkdir -p uploads logs
chmod -R 755 uploads logs
```

## Bước 4: Build và chạy Docker Compose

```bash
# Build và chạy tất cả services
docker-compose up -d --build

# Xem logs
docker-compose logs -f

# Xem logs của service cụ thể
docker-compose logs -f app
docker-compose logs -f redis
docker-compose logs -f qdrant
```

## Bước 5: Kiểm tra services đang chạy

```bash
# Xem trạng thái các containers
docker-compose ps

# Kiểm tra health của app
curl http://localhost:3000/api/health

# Hoặc từ browser:
# http://your-vps-ip:3000/api/health
```

## Các lệnh quản lý thường dùng

### Dừng services
```bash
docker-compose stop
```

### Khởi động lại services
```bash
docker-compose restart
```

### Dừng và xóa containers (giữ volumes)
```bash
docker-compose down
```

### Dừng và xóa tất cả (bao gồm volumes) - **CẨN THẬN!**
```bash
docker-compose down -v
```

### Rebuild lại image
```bash
docker-compose build --no-cache
docker-compose up -d
```

### Xem logs real-time
```bash
docker-compose logs -f app
```

### Vào trong container để debug
```bash
docker-compose exec app sh
```

## Cấu trúc Volumes

- `./uploads` → `/var/www/uploads/iuh` (trong container)
- `./logs` → `/var/log/iuh` (trong container)
- `qdrant_storage` → Named volume cho Qdrant data
- `redis_data` → Named volume cho Redis data

## Troubleshooting

### 1. Lỗi kết nối MongoDB
- Kiểm tra `MONGO_URI` trong `.env`
- Đảm bảo MongoDB đang chạy và accessible
- Nếu MongoDB ở ngoài Docker, dùng IP thực tế thay vì `localhost`

### 2. Lỗi kết nối Redis
- Kiểm tra `REDIS_HOST` và `REDIS_PORT` trong `.env`
- Trong Docker: dùng `redis` (service name) và port `6379`
- Nếu Redis external: dùng IP hoặc `host.docker.internal` (Windows/Mac)

### 3. Lỗi permission uploads/logs
- Đảm bảo thư mục `uploads` và `logs` có quyền 755
- Container sẽ tự động fix permissions khi start

### 4. Lỗi không tìm thấy file .env
- Đảm bảo file `.env` nằm cùng thư mục với `docker-compose.yml`
- Kiểm tra tên file chính xác là `.env` (không có extension)

### 5. Port đã được sử dụng
- Kiểm tra port 3000, 6333, 6334, 6380 có đang được dùng không
- Thay đổi port mapping trong `docker-compose.yml` nếu cần

### 6. Xem logs chi tiết
```bash
# Logs của tất cả services
docker-compose logs

# Logs của app service
docker-compose logs app

# Logs với timestamp
docker-compose logs -t app

# Logs real-time
docker-compose logs -f app
```

## Cập nhật code mới

```bash
# Pull code mới
git pull origin main

# Rebuild và restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Xem logs để đảm bảo không có lỗi
docker-compose logs -f app
```

## Backup dữ liệu

### Backup MongoDB
```bash
# Nếu MongoDB chạy trong Docker khác
docker exec <mongodb-container> mongodump --out /backup

# Hoặc dùng mongodump từ host nếu có cài MongoDB client
mongodump --uri="mongodb://your-mongo-uri" --out ./backup
```

### Backup uploads
```bash
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/
```

### Backup Redis (nếu cần)
```bash
docker-compose exec redis redis-cli SAVE
docker cp iuh-redis:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
```

## Security Notes

1. **KHÔNG commit file `.env`** - File này chứa secrets và đã được thêm vào `.gitignore`
2. **Đổi JWT secrets** - Sử dụng random string dài và phức tạp
3. **Giới hạn CORS** - Chỉ thêm các domain thực sự cần thiết vào `ALLOWED_ORIGINS`
4. **Firewall** - Chỉ mở các port cần thiết (3000 cho API, có thể cần 6333/6334 cho Qdrant nếu external access)
5. **SSL/HTTPS** - Nên dùng reverse proxy (Nginx/Caddy) với SSL certificate

## Reverse Proxy với Nginx (Optional)

Nếu muốn dùng domain và HTTPS, cấu hình Nginx:

```nginx
server {
    listen 80;
    server_name api.iuh.nagentech.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Sau đó cấu hình SSL với Let's Encrypt:
```bash
sudo certbot --nginx -d api.iuh.nagentech.com
```

