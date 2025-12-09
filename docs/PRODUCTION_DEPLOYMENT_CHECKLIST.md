# Production Deployment Checklist

## 📋 Checklist Triển Khai Production

### 1. Environment Variables (.env)

#### ✅ Database & Redis

```env
# MongoDB
MONGO_URI=mongodb://username:password@host:port/database?authSource=admin

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password  # Nếu có
```

#### ✅ Authentication & Security

```env
# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_REFRESH_EXPIRES_IN=30d

# Cookie
COOKIE_SECURE=true  # Bắt buộc true trong production (HTTPS)
```

#### ✅ Email Configuration

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password  # App Password từ Gmail
EMAIL_PORT=587
```

#### ✅ AI Services

```env
# Chọn một trong hai:
AI=openai  # hoặc "gemini"

# Nếu dùng OpenAI:
OPENAI_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Nếu dùng Gemini:
GEMINI_KEY=...
GEMINI_CHAT_MODEL=gemini-2.0-flash
```

#### ✅ Qdrant Vector Database

```env
QDRANT_URL=http://your-qdrant-host:6333
QDRANT_API_KEY=your-qdrant-api-key  # Nếu có
```

#### ✅ File Uploads

```env
UPLOADS_DIR=/path/to/uploads  # Đường dẫn tuyệt đối đến thư mục uploads
```

#### ✅ CORS & Security

```env
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://another-domain.com
NODE_ENV=production
PORT=3000
```

#### ✅ N8N Automation

```env
N8N_WEBHOOK_SECRET=your-secure-random-secret-key
```

---

### 2. Database Setup

#### ✅ MongoDB

- [ ] Tạo database mới hoặc sử dụng database hiện có
- [ ] Tạo user với quyền read/write
- [ ] Kiểm tra connection string
- [ ] **Quan trọng**: Đảm bảo MongoDB có indexes cho performance:
  ```javascript
  // Indexes sẽ được tạo tự động bởi Mongoose, nhưng có thể tối ưu thêm:
  db.accounts.createIndex({ email: 1 }, { unique: true });
  db.reports.createIndex({ createdAt: -1 });
  db.reports.createIndex({ status: 1, createdAt: -1 });
  db.auditlogs.createIndex({ expiresAt: 1 });
  db.auditlogs.createIndex({ status: 1, expiresAt: 1 });
  ```

#### ✅ Redis

- [ ] Cài đặt và cấu hình Redis server
- [ ] Đặt password nếu cần
- [ ] Kiểm tra connection
- [ ] Cấu hình persistence (RDB/AOF) để không mất dữ liệu khi restart

---

### 3. Qdrant Vector Database

#### ✅ Setup Qdrant

- [ ] Cài đặt Qdrant server (Docker hoặc binary)
- [ ] Cấu hình Qdrant URL và API key (nếu có)
- [ ] **Quan trọng**: Collection sẽ được tạo tự động khi app start
  - Nếu dùng OpenAI: Collection `iuh_csvc_knowledge_openai` (1536 dimensions)
  - Nếu dùng Gemini: Collection `iuh_csvc_knowledge` (768 dimensions)
- [ ] Nếu đã có dữ liệu từ Gemini và chuyển sang OpenAI, cần:
  - Xóa collection cũ (768 dimensions)
  - Hoặc tạo collection mới với tên khác
  - Re-index tất cả knowledge documents

#### ✅ Re-index Knowledge Base (Nếu cần)

```bash
# Gọi API để re-index:
POST /api/ai/sync/reindex-all
```

---

### 4. File Uploads Directory

#### ✅ Setup Uploads Directory

- [ ] Tạo thư mục uploads với quyền write:
  ```bash
  mkdir -p /path/to/uploads
  chmod 755 /path/to/uploads
  ```
- [ ] Cấu hình `UPLOADS_DIR` trong `.env`
- [ ] Đảm bảo thư mục có đủ dung lượng
- [ ] **Quan trọng**: Backup thư mục uploads định kỳ

---

### 5. Email Templates

#### ✅ Copy Email Templates

- [ ] Đảm bảo email templates được copy vào `dist/shared/email/templates/` sau khi build
- [ ] Hoặc cấu hình `UPLOADS_DIR` để trỏ đến đúng thư mục
- [ ] Templates cần có:
  - `otp.hbs`
  - `statistics-report.hbs`
  - `overdue-audit-reminder.hbs`
  - `expiring-audit-reminder.hbs`

**Lưu ý**: Code đã tự động detect path:

- Development: `src/shared/email/templates/`
- Production: `shared/email/templates/` (sau khi build)

---

### 6. Build & Deploy

#### ✅ Build Application

```bash
npm install
npm run build
```

#### ✅ Copy Files

```bash
# Copy .env vào dist (nếu cần)
cp .env dist/

# Copy email templates (nếu không tự động)
cp -r src/shared/email/templates dist/shared/email/
```

#### ✅ Start Application

```bash
# Sử dụng PM2 (khuyến nghị)
pm2 start dist/main.js --name iuh-infrastructure-be

# Hoặc
npm run start:prod
```

---

### 7. N8N Configuration

#### ✅ Setup N8N Workflows

- [ ] Cài đặt N8N server
- [ ] Tạo workflows cho các automation tasks
- [ ] Cấu hình webhook URLs với secret:
  - Header: `x-n8n-webhook-secret` = `N8N_WEBHOOK_SECRET` từ .env
- [ ] Test các workflows trước khi activate
- [ ] Schedule các workflows:
  - Monthly report: `0 0 1 * *`
  - Quarterly report: `0 0 1 */3 *`
  - Yearly report: `0 0 1 1 *`
  - Auto-close reports: `0 0 * * 0` (Chủ nhật)
  - Auto-delete expired audits: `0 0 * * 0`
  - Overdue reminders: `0 9 * * *` (9h sáng hàng ngày)
  - Expiring reminders: `0 9 * * *`

---

### 8. Security Checklist

#### ✅ Bảo Mật

- [ ] **BẮT BUỘC**: Đặt `NODE_ENV=production`
- [ ] **BẮT BUỘC**: Đặt `COOKIE_SECURE=true` (chỉ dùng HTTPS)
- [ ] **BẮT BUỘC**: Đặt `N8N_WEBHOOK_SECRET` (bảo vệ webhooks)
- [ ] **BẮT BUỘC**: Sử dụng HTTPS cho API
- [ ] Cấu hình `ALLOWED_ORIGINS` chỉ cho phép frontend domains
- [ ] Đảm bảo JWT secrets đủ mạnh (min 32 ký tự, random)
- [ ] Không commit `.env` file vào git
- [ ] Sử dụng firewall để bảo vệ server
- [ ] Giới hạn rate limiting (đã có ThrottlerModule)

---

### 9. Monitoring & Logging

#### ✅ Logging

- [ ] Kiểm tra log directory có quyền write
- [ ] Cấu hình log rotation (đã có winston-daily-rotate-file)
- [ ] Monitor log files để phát hiện errors

#### ✅ Health Checks

- [ ] Test health check endpoint: `GET /api/health`
- [ ] Setup monitoring service (nếu có) để check health

#### ✅ Performance Monitoring

- [ ] Monitor API response time
- [ ] Monitor database query performance
- [ ] Monitor Redis connection
- [ ] Monitor Qdrant connection
- [ ] Monitor AI API usage và costs

---

### 10. Backup Strategy

#### ✅ Database Backup

- [ ] Setup MongoDB backup (mongodump) định kỳ
- [ ] Backup schedule: Hàng ngày hoặc hàng tuần
- [ ] Test restore process

#### ✅ File Backup

- [ ] Backup thư mục uploads định kỳ
- [ ] Backup Qdrant data (nếu có persistence)

#### ✅ Configuration Backup

- [ ] Backup `.env` file (lưu an toàn, không commit)
- [ ] Document tất cả cấu hình

---

### 11. Performance Optimization

#### ✅ Database Indexes

- [ ] Kiểm tra và tạo indexes cho các queries thường dùng
- [ ] Monitor slow queries

#### ✅ Caching

- [ ] Redis đã được cấu hình cho caching
- [ ] Monitor Redis memory usage

#### ✅ Static Files

- [ ] Cân nhắc sử dụng CDN cho static files (uploads)
- [ ] Hoặc reverse proxy (Nginx) để serve static files

---

### 12. Testing After Deployment

#### ✅ Smoke Tests

- [ ] Test login/logout
- [ ] Test tạo report
- [ ] Test phê duyệt report
- [ ] Test tạo audit log
- [ ] Test AI classification
- [ ] Test RAG chat
- [ ] Test file upload
- [ ] Test email sending
- [ ] Test N8N webhooks

#### ✅ Integration Tests

- [ ] Test tất cả API endpoints
- [ ] Test WebSocket connections
- [ ] Test automation workflows

---

### 13. Post-Deployment

#### ✅ Documentation

- [ ] Document tất cả environment variables
- [ ] Document deployment process
- [ ] Document rollback procedure

#### ✅ Team Training

- [ ] Training cho team về cách sử dụng system
- [ ] Training về monitoring và troubleshooting

---

## 🚨 Common Issues & Solutions

### Issue 1: Email không gửi được

**Solution**:

- Kiểm tra Gmail App Password (không dùng password thường)
- Kiểm tra firewall không block port 587
- Kiểm tra `EMAIL_USER` và `EMAIL_PASSWORD` đúng

### Issue 2: Qdrant connection failed

**Solution**:

- Kiểm tra Qdrant server đang chạy
- Kiểm tra `QDRANT_URL` đúng
- Kiểm tra network connectivity
- Kiểm tra firewall

### Issue 3: Vector dimension mismatch

**Solution**:

- Nếu chuyển từ Gemini sang OpenAI, cần re-index
- Xóa collection cũ và để app tạo mới
- Hoặc tạo collection thủ công với dimension đúng

### Issue 4: File upload không hoạt động

**Solution**:

- Kiểm tra `UPLOADS_DIR` có quyền write
- Kiểm tra disk space
- Kiểm tra file permissions

### Issue 5: N8N webhooks bị reject

**Solution**:

- Kiểm tra `N8N_WEBHOOK_SECRET` đúng
- Kiểm tra header `x-n8n-webhook-secret` được gửi
- Kiểm tra CORS settings

---

## 📝 Environment Variables Template

Tạo file `.env.production` với template sau:

```env
# ============================================
# PRODUCTION ENVIRONMENT VARIABLES
# ============================================

# Application
NODE_ENV=production
PORT=3000

# Database
MONGO_URI=mongodb://username:password@host:port/database?authSource=admin

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars-here
JWT_REFRESH_EXPIRES_IN=30d

# Cookie
COOKIE_SECURE=true

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_PORT=587

# AI Service
AI=openai
OPENAI_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Qdrant
QDRANT_URL=http://your-qdrant-host:6333
QDRANT_API_KEY=your-qdrant-api-key

# File Uploads
UPLOADS_DIR=/path/to/uploads

# CORS
ALLOWED_ORIGINS=https://your-frontend-domain.com

# N8N Automation
N8N_WEBHOOK_SECRET=your-secure-random-secret-key-here
```

---

## ✅ Final Checklist

Trước khi go-live, đảm bảo:

- [ ] Tất cả environment variables đã được cấu hình
- [ ] Database connection thành công
- [ ] Redis connection thành công
- [ ] Qdrant connection thành công
- [ ] Email sending hoạt động
- [ ] File uploads hoạt động
- [ ] AI services hoạt động
- [ ] N8N webhooks hoạt động
- [ ] HTTPS được cấu hình
- [ ] Security settings đã được bật
- [ ] Monitoring đã được setup
- [ ] Backup strategy đã được implement
- [ ] Team đã được training
- [ ] Documentation đã được cập nhật

---

## 📞 Support

Nếu gặp vấn đề khi triển khai, kiểm tra:

1. Logs trong thư mục logs/
2. Health check endpoint: `GET /api/health`
3. Database connection
4. Redis connection
5. Qdrant connection
6. Environment variables
