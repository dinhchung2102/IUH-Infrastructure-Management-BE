# Hướng dẫn các bước để FE gọi API đăng ký tài khoản và xử lý

## 1. Chuẩn bị dữ liệu gửi lên (theo `RegisterDto`)

Khi người dùng đăng ký, FE cần thu thập và gửi các trường sau lên API:

- `username`: Bắt buộc, chuỗi, tuân thủ độ dài theo config.
- `password`: Bắt buộc, chuỗi, tuân thủ độ dài theo config.
- `email`: Bắt buộc, đúng định dạng email, tuân thủ độ dài theo config.
- `fullName`: Bắt buộc, chuỗi, tuân thủ độ dài theo config.
- `phoneNumber`: Tùy chọn, chuỗi, đúng định dạng số điện thoại.
- `address`: Tùy chọn, chuỗi, tuân thủ độ dài theo config.
- `gender`: Tùy chọn, giá trị MALE hoặc FEMALE.
- `dateOfBirth`: Tùy chọn, định dạng ngày ISO (YYYY-MM-DD).
- `authOTP`: Bắt buộc, chuỗi OTP xác thực (FE cần lấy OTP này từ email người dùng).

## 2. Các bước FE thực hiện để đăng ký tài khoản

1. **Gửi yêu cầu lấy OTP về email**
   - FE gọi API gửi OTP (thường là `/auth/send-otp` hoặc tương tự) với email người dùng.
   - Hiển thị thông báo cho người dùng kiểm tra email để lấy mã OTP.

2. **Người dùng nhập OTP**
   - FE hiển thị form nhập OTP cho người dùng sau khi họ nhận được email.

3. **Gửi yêu cầu đăng ký**
   - FE thu thập toàn bộ thông tin đăng ký, bao gồm cả OTP vừa nhập.
   - Gửi POST request tới API đăng ký (ví dụ: `/auth/register`) với body là object chứa các trường ở trên.

4. **Xử lý response từ API**
   - Nếu đăng ký thành công: Hiển thị thông báo thành công, có thể chuyển hướng sang trang đăng nhập hoặc tự động đăng nhập.
   - Nếu lỗi (ví dụ: OTP sai, email đã tồn tại, thiếu trường, v.v): Hiển thị thông báo lỗi tương ứng cho người dùng.

## 3. Response mẫu từ API khi đăng ký thành công
