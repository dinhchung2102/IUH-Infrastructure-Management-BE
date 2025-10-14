# CORS và Cookie Setup Guide

## 🎯 Tổng quan

Hướng dẫn cấu hình CORS và Cookie để hỗ trợ:

- ✅ Development: Frontend localhost + Backend localhost
- ✅ **Cross-domain: Frontend localhost + Backend deployed**
- ✅ Production: Frontend deployed + Backend deployed

## 📋 Cấu hình Backend

### 1. Tạo file `.env` (nếu chưa có)

Tạo file `.env` trong thư mục root của backend:

```bash
# Environment
NODE_ENV=development

# Server
PORT=3000

# CORS - Allowed Origins (QUAN TRỌNG!)
# Thêm tất cả domain frontend vào đây, cách nhau bằng dấu phẩy
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5174

# Cookie Security
# Optional: Override cookie secure setting (for testing only)
# COOKIE_SECURE=false  # Force disable secure flag (development/testing only)
# COOKIE_SECURE=true   # Force enable secure flag (requires HTTPS)
# If not set, defaults to NODE_ENV === 'production'

# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=1d
JWT_REMEMBER=30d
```

### 2. Cấu hình cho các môi trường khác nhau

#### 🔧 Development (localhost FE + localhost BE)

```env
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

#### 🌐 Development (localhost FE + Backend deployed)

**QUAN TRỌNG**: Đây là trường hợp của bạn!

**Option 1: Backend có HTTPS (Khuyến nghị)**

```env
# Trên server backend deployed với HTTPS
NODE_ENV=production
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000
```

**Option 2: Backend chưa có HTTPS (Chỉ để test)**

```env
# Trên server backend deployed CHƯA có HTTPS
NODE_ENV=production
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
COOKIE_SECURE=false  # ⚠️ CHỈ ĐỂ TEST! Không dùng trong production thực tế
```

**Lưu ý**:

- **Khuyến nghị**: Backend nên chạy qua **HTTPS** (SSL certificate)
- Cookie với `sameSite: 'none'` + `secure: true` là best practice cho production
- `COOKIE_SECURE=false` chỉ dùng tạm để test, không an toàn cho production thực tế

#### 🚀 Production (FE deployed + BE deployed)

```env
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://admin.your-frontend-domain.com
```

## 📱 Cấu hình Frontend

### Với Axios

```javascript
// Trong file config axios hoặc main.js/ts
import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'https://your-backend-api.com/api'; // hoặc http://localhost:3000/api

// Hoặc cho từng request
axios.post('/auth/login', data, {
  withCredentials: true,
});
```

### Với Fetch

```javascript
fetch('https://your-backend-api.com/api/auth/login', {
  method: 'POST',
  credentials: 'include', // QUAN TRỌNG!
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(loginData),
});
```

### Với React Query / TanStack Query

```javascript
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
});

// Với axios
axios.defaults.withCredentials = true;
```

## 🔍 Kiểm tra Cookie

### 1. Kiểm tra trong Browser DevTools

1. Mở **DevTools** (F12)
2. Tab **Application** → **Cookies**
3. Chọn domain của backend
4. Phải thấy cookie `refresh_token` với các thuộc tính:
   - `HttpOnly`: ✓
   - `Secure`: ✓ (nếu HTTPS)
   - `SameSite`: Lax (dev) hoặc None (production)

### 2. Kiểm tra Network Request

1. Mở **DevTools** → **Network**
2. Login
3. Click vào request `login`
4. Tab **Headers** → **Response Headers**
5. Phải thấy:
   ```
   Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax
   ```

## ⚠️ Lỗi thường gặp

### Lỗi 1: "Not allowed by CORS"

**Nguyên nhân**: Origin của frontend không có trong `ALLOWED_ORIGINS`

**Giải pháp**:

```env
# Thêm origin frontend vào .env
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.com
```

### Lỗi 2: Cookie không được lưu

**Nguyên nhân**:

- Frontend không gửi `credentials: 'include'` hoặc `withCredentials: true`
- Backend chưa có HTTPS (khi sameSite: 'none')

**Giải pháp**:

```javascript
// Frontend: Luôn gửi credentials
axios.defaults.withCredentials = true;
// hoặc
fetch(url, { credentials: 'include' });
```

### Lỗi 3: "sameSite=None requires Secure attribute"

**Nguyên nhân**: Production cần HTTPS

**Giải pháp**:

- Setup SSL certificate cho backend (Let's Encrypt, Cloudflare, etc.)
- Hoặc dùng reverse proxy như Nginx với SSL

## 🎯 Logic hiện tại

### Cookie Settings

```typescript
// Development (localhost ↔ localhost)
{
  httpOnly: true,
  secure: false,           // HTTP OK
  sameSite: 'lax',        // Cho phép cross-port
  maxAge: 1d hoặc 30d
}

// Production (deployed ↔ deployed hoặc localhost ↔ deployed)
{
  httpOnly: true,
  secure: true,            // Bắt buộc HTTPS
  sameSite: 'none',       // Cho phép cross-domain
  maxAge: 1d hoặc 30d
}
```

## 📝 Checklist

- [ ] Tạo file `.env` với `ALLOWED_ORIGINS`
- [ ] Thêm origin frontend vào `ALLOWED_ORIGINS`
- [ ] Restart backend server
- [ ] Frontend config `withCredentials: true` hoặc `credentials: 'include'`
- [ ] Kiểm tra cookie trong DevTools
- [ ] (Production) Setup HTTPS cho backend
- [ ] Test login và refresh token

## 🔗 Tài liệu tham khảo

- [MDN: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [SameSite Cookie Explained](https://web.dev/samesite-cookies-explained/)
