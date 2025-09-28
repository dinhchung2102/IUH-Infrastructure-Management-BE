# Hướng dẫn cơ chế Login, Access Token và Refresh Token cho FE

## 1. Quy trình Login

### a. Gửi yêu cầu đăng nhập

- FE thu thập thông tin đăng nhập từ người dùng (`username` hoặc `email`, `password`).
- Gửi POST request tới API `/auth/login` với body:
  ```json
  {
    "username": "user_example",
    "password": "your_password"
  }
  ```

### b. Xử lý response từ API

- Nếu đăng nhập thành công, BE trả về:
  ```json
  {
    "message": "Đăng nhập thành công",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "account": {
      "_id": "...",
      "username": "...",
      "email": "...",
      "fullName": "...",
      "phoneNumber": "...",
      "address": "...",
      "avatar": "...",
      "gender": "...",
      "dateOfBirth": "...",
      "isActive": true,
      "role": "...",
      "permissions": [...]
    }
  }
  ```
- FE cần lưu `access_token` và `refresh_token` vào localStorage hoặc secure storage (tùy nền tảng).

## 2. Sử dụng Access Token để gọi API

- Khi gọi các API cần xác thực, FE gửi `access_token` trong header:
  ```
  Authorization: Bearer <access_token>
  ```
- Nếu token hợp lệ, BE trả về dữ liệu như bình thường.

## 3. Xử lý khi Access Token hết hạn

- Nếu BE trả về lỗi 401 (Unauthorized) do access token hết hạn, FE cần thực hiện quy trình làm mới token như sau:

### a. Gửi yêu cầu refresh token

- Gửi POST request tới `/auth/refresh-token` với body:
  ```json
  {
    "refreshToken": "<refresh_token>"
  }
  ```

### b. Xử lý response refresh token

- Nếu refresh thành công, BE trả về:
  ```json
  {
    "message": "Token đã được làm mới thành công",
    "access_token": "<new_access_token>",
    "refresh_token": "<new_refresh_token>",
    "account": { ... }
  }
  ```
- FE cập nhật lại `access_token` và `refresh_token` mới vào storage.
- Thực hiện lại request API trước đó với access token mới.

- Nếu refresh token cũng hết hạn hoặc không hợp lệ, BE trả về lỗi 401/403. FE cần chuyển hướng người dùng về trang đăng nhập.

## 4. Đăng xuất

- Khi người dùng logout, FE nên gọi API `/auth/logout` (nếu có) để BE xóa refresh token phía server.
- Xóa toàn bộ token ở FE (localStorage/secure storage).

---

## **Tóm tắt luồng FE**

1. Đăng nhập → Nhận access token + refresh token → Lưu trữ.
2. Gọi API → Gửi access token.
3. Nếu access token hết hạn → Gửi refresh token để lấy access token mới.
4. Nếu refresh token hết hạn → Bắt buộc đăng nhập lại.
5. Đăng xuất → Xóa token ở FE và gọi API logout (nếu có).

---

## **Lưu ý bảo mật**

- Không lưu token ở localStorage nếu có thể, nên dùng HttpOnly cookie hoặc secure storage (mobile).
- Luôn kiểm tra lỗi 401 để tự động làm mới token hoặc chuyển hướng đăng nhập.
- Không gửi refresh token trong URL, chỉ gửi trong body của request.
