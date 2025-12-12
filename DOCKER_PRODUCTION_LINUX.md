# Hướng dẫn Deploy Production trên Linux

## Vấn đề trên Linux

Trên Linux, Docker có một số khác biệt so với Windows/Mac:

1. **`host.docker.internal` không hoạt động mặc định** - Cần cấu hình thêm (chỉ cần nếu MongoDB chạy trên host)
2. **Permissions** - Cần đảm bảo quyền đúng cho volumes (uploads, logs)
3. **Kết nối host services** - Chỉ MongoDB có thể chạy trên host, Redis và Qdrant chạy trong Docker Compose

## Giải pháp

### 1. Cấu hình Services

**Trong `docker-compose.prod.yml`:**

- **App**: Dùng `network_mode: host` để kết nối trực tiếp với services trên host
- **Redis**: Chạy trong Docker, expose port `6379:6379` để app có thể kết nối qua `localhost:6379`
- **Qdrant**: Chạy trong Docker, expose port `6333:6333` để app có thể kết nối qua `localhost:6333`
- **MongoDB**: Chạy trên host, app kết nối qua `localhost:27017`

**Lợi ích của `network_mode: host`:**

- Không cần port mapping cho app (chạy trực tiếp trên port 4890 của host)
- Dễ kết nối với services trên host (MongoDB, Redis, Qdrant)
- Không cần `extra_hosts` hoặc IP mapping
- Đơn giản hơn cho production trên Linux

#### Cách 2: Dùng IP thực tế của host

Nếu `host-gateway` không hoạt động, lấy IP của host:

```bash
# Lấy IP của Docker bridge gateway (thường là 172.17.0.1)
ip addr show docker0 | grep "inet " | awk '{print $2}' | cut -d/ -f1

# Hoặc lấy IP của host trong network
hostname -I | awk '{print $1}'
```

Sau đó cập nhật `.env`:

```env
# Thay host.docker.internal bằng IP thực tế
MONGO_URI=mongodb://172.17.0.1:27017/iuh-infrastructure
REDIS_HOST=172.17.0.1
REDIS_PORT=6379
QDRANT_URL=http://172.17.0.1:6333
```

#### Cách 3: Dùng network_mode: host (Không khuyến khích)

Chỉ dùng nếu thực sự cần thiết, vì mất tính isolation:

```yaml
network_mode: host
```

### 2. Xử lý Permissions

#### Tự động (khuyến nghị)

File `docker-compose.prod.yml` đã được cấu hình với:

```yaml
user: '${UID:-1000}:${GID:-1000}'
```

Chạy với UID/GID của user hiện tại:

```bash
# Export UID và GID trước khi chạy
export UID=$(id -u)
export GID=$(id -g)

# Hoặc set trực tiếp trong .env
echo "UID=$(id -u)" >> .env
echo "GID=$(id -g)" >> .env

# Chạy docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

#### Thủ công

Nếu vẫn gặp vấn đề permissions:

```bash
# Tạo thư mục với quyền đúng
mkdir -p uploads logs
chmod -R 755 uploads logs

# Set ownership (thay username bằng user của bạn)
sudo chown -R $USER:$USER uploads logs

# Hoặc set ownership cho www-data (nếu dùng Nginx)
sudo chown -R www-data:www-data uploads logs
```

### 3. Cấu hình MongoDB trên Host (nếu MongoDB chạy trên host)

**Bước 1: Lấy IP của host để kết nối từ Docker**

```bash
# Lấy IP Docker bridge gateway (thường là 172.17.0.1)
ip addr show docker0 | grep "inet " | awk '{print $2}' | cut -d/ -f1

# Hoặc lấy IP của host trong network
hostname -I | awk '{print $1}'
```

**Bước 2: Cấu hình MongoDB cho phép kết nối từ Docker**

```bash
# Sửa /etc/mongod.conf
sudo nano /etc/mongod.conf
```

Thêm hoặc sửa:

```yaml
net:
  bindIp: 0.0.0.0 # Cho phép kết nối từ mọi IP (hoặc chỉ IP Docker bridge)
  port: 27017
```

Restart MongoDB:

```bash
sudo systemctl restart mongod
```

**Bước 3: Cập nhật .env với IP thực tế**

```env
# Thay 172.17.0.1 bằng IP thực tế từ bước 1
MONGO_URI=mongodb://172.17.0.1:27017/iuh-infrastructure
```

**Lưu ý:**

- Redis và Qdrant đã chạy trong Docker Compose, không cần cấu hình trên host
- Bind mounts cho uploads và logs được mount từ host để persist data

## Các bước Deploy

### Bước 1: Chuẩn bị môi trường

```bash
# Tạo thư mục project
mkdir -p /opt/iuh-infrastructure-be
cd /opt/iuh-infrastructure-be

# Clone hoặc pull code
git clone <your-repo> .
# hoặc
git pull origin main
```

### Bước 2: Tạo file .env

```bash
nano .env
```

Thêm các biến:

```env
# MongoDB - dùng localhost vì network_mode: host
MONGO_URI=mongodb://localhost:27017/iuh-infrastructure

# Redis - dùng localhost vì network_mode: host
# REDIS_HOST và REDIS_PORT đã được set trong docker-compose.prod.yml (localhost:6379)
# Có thể override nếu cần:
# REDIS_HOST=localhost
# REDIS_PORT=6379

# Qdrant - dùng localhost vì network_mode: host
# QDRANT_URL đã được set trong docker-compose.prod.yml (http://localhost:6333)
# Có thể override nếu cần:
# QDRANT_URL=http://localhost:6333

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_PORT=587

# App Config
NODE_ENV=production
LOG_LEVEL=info
ALLOWED_ORIGINS=https://iuh.nagentech.com
COOKIE_SECURE=true

# Uploads
UPLOADS_DIR=/var/www/uploads/iuh

# UID/GID cho permissions (tự động lấy từ user hiện tại)
UID=$(id -u)
GID=$(id -g)
```

### Bước 3: Tạo thư mục và set permissions

**Cách 1: Dùng script tự động (khuyến nghị)**

```bash
# Make script executable
chmod +x setup-permissions.sh

# Chạy script (sẽ dùng sudo để set ownership)
./setup-permissions.sh
```

**Cách 2: Thủ công**

```bash
# Tạo thư mục
mkdir -p uploads logs

# Set permissions (với sudo nếu cần)
sudo chown -R $USER:$USER uploads logs
chmod -R 755 uploads logs
```

### Bước 4: Export UID/GID và chạy

```bash
# Export UID/GID
export UID=$(id -u)
export GID=$(id -g)

# Build và chạy (build từ Dockerfile local)
docker-compose -f docker-compose.prod.yml up -d --build

# Hoặc build riêng trước, sau đó chạy
# docker-compose -f docker-compose.prod.yml build
# docker-compose -f docker-compose.prod.yml up -d

# Xem logs
docker-compose -f docker-compose.prod.yml logs -f app
```

### Bước 5: Kiểm tra

```bash
# Xem trạng thái
docker-compose -f docker-compose.prod.yml ps

# Test healthcheck
curl http://localhost:3000/api/health

# Kiểm tra logs
docker-compose -f docker-compose.prod.yml logs app
```

## Troubleshooting

### 1. Không kết nối được MongoDB/Redis/Qdrant

**Kiểm tra:**

```bash
# Test từ container (với network_mode: host, app dùng network của host)
docker-compose -f docker-compose.prod.yml exec app sh
# Trong container:
# Test Redis (trên localhost)
redis-cli -h localhost ping

# Test Qdrant (trên localhost)
curl http://localhost:6333/health

# Test MongoDB (trên localhost)
mongo mongodb://localhost:27017/iuh-infrastructure --eval "db.stats()"
```

**Giải pháp:**

- **Redis/Qdrant**:
  - Đảm bảo services đang chạy: `docker-compose -f docker-compose.prod.yml ps`
  - Đảm bảo ports được expose: Redis `6379:6379`, Qdrant `6333:6333`
- **MongoDB trên host**:
  - Đảm bảo MongoDB đang chạy: `sudo systemctl status mongod`
  - Đảm bảo MongoDB bind đúng IP (0.0.0.0 hoặc 127.0.0.1)
  - Test kết nối: `mongo mongodb://localhost:27017/iuh-infrastructure`

### 2. Permission denied cho uploads/logs

**Kiểm tra:**

```bash
ls -la uploads/
ls -la logs/
```

**Giải pháp:**

```bash
# Set ownership
sudo chown -R $USER:$USER uploads logs

# Hoặc set permissions rộng hơn (tạm thời để test)
chmod -R 777 uploads logs
```

### 3. Container không start

**Kiểm tra logs:**

```bash
docker-compose -f docker-compose.prod.yml logs app
```

**Các nguyên nhân thường gặp:**

- Thiếu file `.env`
- MongoDB/Redis không accessible
- Port đã được sử dụng
- Permissions không đúng

### 4. Healthcheck fail

**Kiểm tra:**

```bash
# Xem health status
docker inspect iuh-csvc-api | grep -A 10 Health

# Test endpoint thủ công
docker-compose -f docker-compose.prod.yml exec app curl http://localhost:3000/api/health
```

## Cập nhật

```bash
# Pull code mới (nếu dùng git)
git pull origin main

# Rebuild image với code mới
docker-compose -f docker-compose.prod.yml build --no-cache app

# Restart với image mới
docker-compose -f docker-compose.prod.yml up -d

# Hoặc build và restart cùng lúc
docker-compose -f docker-compose.prod.yml up -d --build

# Xem logs
docker-compose -f docker-compose.prod.yml logs -f app
```

## Lưu ý bảo mật

1. **Firewall**: Chỉ mở port cần thiết (3000 cho API, 6333/6334 cho Qdrant nếu cần external access)
2. **MongoDB**: Nếu chạy trên host, không bind 0.0.0.0 nếu không cần thiết, dùng firewall rules
3. **Redis/Qdrant**: Chạy trong Docker network, chỉ accessible từ containers trong cùng network
4. **Volumes**: Named volumes (qdrant_storage, redis_data) được quản lý bởi Docker, an toàn hơn bind mounts
5. **.env file**: Không commit vào git, giữ bảo mật
6. **SSL/HTTPS**: Dùng reverse proxy (Nginx/Caddy) với SSL

## Reverse Proxy với Nginx

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

Cấu hình SSL:

```bash
sudo certbot --nginx -d api.iuh.nagentech.com
```
