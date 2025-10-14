# 🍪 Quick Setup: Cookie Cross-Domain

## Vấn đề hiện tại

Frontend (localhost) + Backend (deployed) → Cookie không được lưu

## ✅ Giải pháp nhanh (3 bước)

### Bước 1: Tạo file `.env` trên server backend

**Nếu backend có HTTPS:**

```env
NODE_ENV=production
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Nếu backend CHƯA có HTTPS (chỉ để test):**

```env
NODE_ENV=production
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
COOKIE_SECURE=false
```

### Bước 2: Restart backend server

```bash
npm run start:dev
# hoặc
npm run start:prod
```

### Bước 3: Frontend config

**Với Axios:**

```javascript
import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'https://your-backend.com/api';
```

**Với Fetch:**

```javascript
fetch('https://your-backend.com/api/auth/login', {
  method: 'POST',
  credentials: 'include', // ← QUAN TRỌNG!
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(loginData),
});
```

## 🔍 Kiểm tra

1. Login từ frontend
2. Mở DevTools → Application → Cookies
3. Phải thấy `refresh_token` cookie

## ⚠️ Lưu ý Production

- `COOKIE_SECURE=false` chỉ dùng để TEST
- Production thực tế **BẮT BUỘC** phải có HTTPS
- Setup SSL: Let's Encrypt, Cloudflare, hoặc reverse proxy (Nginx)

## 📚 Tài liệu chi tiết

Xem: [CORS_AND_COOKIE_SETUP.md](./docs/CORS_AND_COOKIE_SETUP.md)
