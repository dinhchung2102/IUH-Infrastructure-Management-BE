# Fix: Ảnh không hiển thị khi chạy Docker

## Vấn đề

Files đã có trong `/var/www/uploads/iuh` trên host nhưng không hiển thị được khi chạy Docker.

## Nguyên nhân

1. **Mount path sai**: Docker Compose đang mount `./uploads` (relative) thay vì `/var/www/uploads/iuh` (absolute)
2. **UPLOADS_DIR trong .env**: Cần đảm bảo đúng path

## Giải pháp

### 1. Đã sửa docker-compose.prod.yml

```yaml
volumes:
  - /var/www/uploads/iuh:/var/www/uploads/iuh:rw  # Absolute path
  - /var/log/iuh:/var/log/iuh:rw
```

### 2. Kiểm tra .env file

Đảm bảo có:
```env
UPLOADS_DIR=/var/www/uploads/iuh
```

### 3. Kiểm tra permissions

```bash
# Kiểm tra permissions trên host
ls -la /var/www/uploads/iuh

# Nếu cần, fix permissions
sudo chown -R $USER:$USER /var/www/uploads/iuh
chmod -R 755 /var/www/uploads/iuh
```

### 4. Restart container

```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

### 5. Kiểm tra logs

```bash
# Xem logs để kiểm tra path được sử dụng
docker-compose -f docker-compose.prod.yml logs app | grep -i upload

# Nên thấy:
# "Serving static files from: /var/www/uploads/iuh"
# "Using UPLOADS_DIR from .env: /var/www/uploads/iuh"
```

### 6. Test truy cập ảnh

```bash
# Test từ host
curl http://localhost:3000/uploads/1764996935895-wscyp6.jpg

# Hoặc từ browser
http://your-server-ip:3000/uploads/1764996935895-wscyp6.jpg
```

## Lưu ý

- **Mount path**: Phải dùng absolute path `/var/www/uploads/iuh` thay vì relative `./uploads`
- **UPLOADS_DIR**: Phải match với mount path trong container
- **Permissions**: Container cần quyền đọc files (node user hoặc permissions 755)

