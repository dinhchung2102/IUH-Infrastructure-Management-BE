# Hướng Dẫn Cấu Hình Nginx Cho Upload File Lớn

## Vấn Đề

Khi deploy lên production, API upload file bị lỗi `413 Request Entity Too Large` mặc dù ở local hoạt động bình thường. Điều này xảy ra vì **Nginx reverse proxy** có giới hạn mặc định là **1MB** cho request body.

## Giải Pháp

### 1. Tìm File Cấu Hình Nginx

File cấu hình Nginx thường nằm ở:
- `/etc/nginx/sites-available/your-site` (Ubuntu/Debian)
- `/etc/nginx/conf.d/your-site.conf` (CentOS/RHEL)
- Hoặc trong thư mục cấu hình Nginx của bạn

### 2. Cấu Hình Nginx

Thêm hoặc cập nhật các dòng sau trong block `server` hoặc `location` của Nginx:

```nginx
server {
    listen 80;
    server_name api.iuh.nagentech.com;

    # Tăng giới hạn body size lên 10MB
    client_max_body_size 10M;
    
    # Tăng timeout cho upload file lớn
    client_body_timeout 60s;
    client_header_timeout 60s;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # Headers cần thiết
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Tăng buffer size cho proxy
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        
        # Tăng timeout
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 3. Nếu Dùng HTTPS (SSL)

```nginx
server {
    listen 443 ssl;
    server_name api.iuh.nagentech.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Tăng giới hạn body size lên 10MB
    client_max_body_size 10M;
    
    # Tăng timeout
    client_body_timeout 60s;
    client_header_timeout 60s;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 4. Kiểm Tra Cấu Hình

```bash
# Kiểm tra syntax Nginx
sudo nginx -t

# Nếu OK, reload Nginx
sudo nginx -s reload
# hoặc
sudo systemctl reload nginx
```

## Các Tham Số Quan Trọng

| Tham Số | Giá Trị | Mô Tả |
|---------|---------|-------|
| `client_max_body_size` | `10M` | Giới hạn kích thước request body (10MB) |
| `client_body_timeout` | `60s` | Timeout cho việc đọc request body |
| `client_header_timeout` | `60s` | Timeout cho việc đọc request headers |
| `proxy_connect_timeout` | `60s` | Timeout kết nối đến backend |
| `proxy_send_timeout` | `60s` | Timeout gửi request đến backend |
| `proxy_read_timeout` | `60s` | Timeout đọc response từ backend |

## Lưu Ý

1. **Restart Server**: Sau khi cấu hình Nginx, cần restart/reload Nginx để áp dụng thay đổi
2. **Kiểm Tra Logs**: Nếu vẫn lỗi, kiểm tra logs:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```
3. **Firewall**: Đảm bảo port 80/443 đã được mở
4. **Backend App**: Đảm bảo NestJS app đã được restart sau khi deploy code mới

## Kiểm Tra Sau Khi Cấu Hình

```bash
# Test upload file lớn
curl -X PATCH https://api.iuh.nagentech.com/api/news/ID \
  -H "Authorization: Bearer TOKEN" \
  -F "thumbnail=@large-image.jpg" \
  -F "title=Test" \
  -F "description=Test"
```

## Nếu Vẫn Lỗi

1. Kiểm tra xem có Load Balancer (AWS ALB, Cloudflare, etc.) không - cần cấu hình tương tự
2. Kiểm tra logs Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Kiểm tra logs NestJS app
4. Đảm bảo đã restart cả Nginx và NestJS app sau khi deploy

