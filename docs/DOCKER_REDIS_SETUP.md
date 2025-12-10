# Hướng dẫn cấu hình Redis cho Docker

## Vấn đề: Redis container riêng không kết nối được

Nếu Redis chạy trong container riêng (không trong docker-compose.yml này), bạn cần cấu hình để app container có thể kết nối được.

## Các trường hợp và cách xử lý

### Trường hợp 1: Redis container trong cùng Docker network

Nếu Redis container đã join vào network `iuh-network`:

1. Tìm tên container Redis:

```bash
docker ps | grep redis
```

2. Cập nhật `.env`:

```env
REDIS_HOST=<tên-container-redis>
REDIS_PORT=6379
# Ví dụ: REDIS_HOST=iuh-redis
```

### Trường hợp 2: Redis container trong network khác

Nếu Redis container ở network khác, bạn có 2 cách:

#### Cách 1: Thêm app vào network của Redis

1. Tìm network của Redis container:

```bash
docker inspect <redis-container-name> | grep NetworkMode
```

2. Cập nhật `docker-compose.yml`:

```yaml
app:
  networks:
    - iuh-network
    - redis-network # Thêm network của Redis
```

3. Tạo network external (nếu cần):

```yaml
networks:
  iuh-network:
    driver: bridge
  redis-network:
    external: true
    name: <tên-network-của-redis>
```

4. Cập nhật `.env`:

```env
REDIS_HOST=<tên-container-redis>
REDIS_PORT=6379
```

#### Cách 2: Dùng IP của Redis container

1. Lấy IP của Redis container:

```bash
docker inspect <redis-container-name> | grep IPAddress
```

2. Cập nhật `.env`:

```env
REDIS_HOST=<ip-của-redis-container>
REDIS_PORT=6379
```

### Trường hợp 3: Redis chạy trên host machine (không phải container)

1. **Linux/Mac**: Dùng `host.docker.internal`

```env
REDIS_HOST=host.docker.internal
REDIS_PORT=6379
```

2. **Windows**: Dùng IP của host hoặc `host.docker.internal`

```env
REDIS_HOST=host.docker.internal
# Hoặc
REDIS_HOST=192.168.x.x  # IP của máy Windows
REDIS_PORT=6379
```

### Trường hợp 4: Redis ở server khác (remote)

```env
REDIS_HOST=<ip-hoặc-domain-của-redis-server>
REDIS_PORT=6379
REDIS_PASSWORD=<password-nếu-có>
```

## Kiểm tra kết nối

Sau khi cấu hình, kiểm tra kết nối:

```bash
# Vào trong app container
docker exec -it iuh-csvc-api sh

# Test kết nối Redis
node -e "const redis = require('ioredis'); const client = new redis({host: process.env.REDIS_HOST, port: process.env.REDIS_PORT}); client.ping().then(r => console.log('Redis connected:', r)).catch(e => console.error('Redis error:', e));"
```

## Troubleshooting

### Lỗi: "ECONNREFUSED"

- Kiểm tra Redis container đã chạy chưa: `docker ps | grep redis`
- Kiểm tra REDIS_HOST và REDIS_PORT trong `.env` có đúng không
- Kiểm tra Redis có listen trên đúng port không: `docker logs <redis-container>`

### Lỗi: "Network unreachable"

- Đảm bảo app container và Redis container ở cùng network hoặc có thể giao tiếp
- Thử ping từ app container: `docker exec -it iuh-csvc-api ping <redis-host>`

### Lỗi: "Connection timeout"

- Kiểm tra firewall có chặn port 6379 không
- Kiểm tra Redis có bind đúng interface không (0.0.0.0 thay vì 127.0.0.1)

## Ví dụ cấu hình .env

```env
# Redis configuration
REDIS_HOST=iuh-redis  # Tên container Redis
REDIS_PORT=6379
REDIS_PASSWORD=  # Để trống nếu không có password
```
