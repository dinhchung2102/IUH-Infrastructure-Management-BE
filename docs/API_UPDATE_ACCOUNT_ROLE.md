# Hướng dẫn API Cập nhật Role cho Account (Admin)

## Tổng quan

API này cho phép Admin cập nhật role (vai trò) cho một tài khoản trong hệ thống. Chỉ có Admin mới có quyền thực hiện thao tác này.

## Endpoint

```
PATCH /api/auth/accounts/:id
```

## Phương thức

`PATCH`

## Quyền truy cập

- **Permission yêu cầu**: `ACCOUNT:ADMIN_ACTION`
- **Role yêu cầu**: Chỉ Admin mới có quyền này

## Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Path Parameters

| Tên  | Kiểu   | Bắt buộc | Mô tả                                          |
| ---- | ------ | -------- | ---------------------------------------------- |
| `id` | string | Có       | ID của account cần cập nhật (MongoDB ObjectId) |

## Request Body

Body là một object JSON với các field tùy chọn. Để cập nhật role, chỉ cần gửi field `role`.

```json
{
  "role": "507f1f77bcf86cd799439011"
}
```

### Các field có thể cập nhật:

| Field         | Kiểu              | Bắt buộc | Mô tả           | Validation                      |
| ------------- | ----------------- | -------- | --------------- | ------------------------------- |
| `role`        | string (ObjectId) | Không    | ID của role mới | Phải là MongoDB ObjectId hợp lệ |
| `fullName`    | string            | Không    | Tên đầy đủ      | 2-100 ký tự                     |
| `email`       | string            | Không    | Email           | Phải là email hợp lệ, unique    |
| `phoneNumber` | string            | Không    | Số điện thoại   | Unique                          |
| `address`     | string            | Không    | Địa chỉ         | -                               |
| `avatar`      | string            | Không    | URL avatar      | -                               |
| `gender`      | string            | Không    | Giới tính       | MALE, FEMALE, OTHER             |
| `dateOfBirth` | string            | Không    | Ngày sinh       | Format: ISO date string         |

## Response

### Success Response (200 OK)

```json
{
  "message": "Cập nhật tài khoản thành công",
  "updatedAccount": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "fullName": "Nguyễn Văn A",
    "phoneNumber": "0123456789",
    "role": {
      "_id": "507f1f77bcf86cd799439012",
      "roleName": "STAFF"
    },
    "isActive": true,
    "areasManaged": [],
    "zonesManaged": [],
    "buildingsManaged": [],
    "campusManaged": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Error Responses

#### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

#### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Bạn không có quyền thực hiện thao tác này"
}
```

#### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Tài khoản không tồn tại"
}
```

hoặc

```json
{
  "statusCode": 404,
  "message": "Role không tồn tại"
}
```

#### 409 Conflict

```json
{
  "statusCode": 409,
  "message": "Email đã được sử dụng"
}
```

hoặc

```json
{
  "statusCode": 409,
  "message": "Số điện thoại đã được sử dụng"
}
```

#### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": ["ID role không hợp lệ"],
  "error": "Bad Request"
}
```

## Các bước thực hiện

### Bước 1: Lấy danh sách Roles

Trước khi cập nhật role, bạn cần lấy danh sách các role có sẵn để biết role ID.

**Endpoint**: `GET /api/auth/roles`

**Request**:

```bash
GET /api/auth/roles
Authorization: Bearer <access_token>
```

**Response**:

```json
{
  "message": "Lấy danh sách vai trò thành công",
  "roles": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "roleName": "ADMIN",
      "isActive": true,
      "permissions": [...]
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "roleName": "STAFF",
      "isActive": true,
      "permissions": [...]
    },
    {
      "_id": "507f1f77bcf86cd799439014",
      "roleName": "GUEST",
      "isActive": true,
      "permissions": [...]
    },
    {
      "_id": "507f1f77bcf86cd799439015",
      "roleName": "STUDENT",
      "isActive": true,
      "permissions": [...]
    },
    {
      "_id": "507f1f77bcf86cd799439016",
      "roleName": "LECTURER",
      "isActive": true,
      "permissions": [...]
    },
    {
      "_id": "507f1f77bcf86cd799439017",
      "roleName": "CAMPUS_ADMIN",
      "isActive": true,
      "permissions": [...]
    }
  ],
  "total": 6
}
```

### Bước 2: Lấy Account ID cần cập nhật

Bạn cần biết ID của account cần cập nhật. Có thể lấy từ:

- Danh sách accounts: `GET /api/auth/accounts`
- Thông tin account cụ thể: `GET /api/auth/accounts/:id`

### Bước 3: Cập nhật Role

**Request Example**:

```bash
PATCH /api/auth/accounts/507f1f77bcf86cd799439011
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "role": "507f1f77bcf86cd799439013"
}
```

**cURL Example**:

```bash
curl -X PATCH \
  https://api.iuh.nagentech.com/api/auth/accounts/507f1f77bcf86cd799439011 \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "role": "507f1f77bcf86cd799439013"
  }'
```

**JavaScript/Fetch Example**:

```javascript
const updateAccountRole = async (accountId, roleId) => {
  const response = await fetch(
    `https://api.iuh.nagentech.com/api/auth/accounts/${accountId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: roleId,
      }),
    },
  );

  const data = await response.json();
  return data;
};

// Sử dụng
updateAccountRole('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439013');
```

**Axios Example**:

```javascript
import axios from 'axios';

const updateAccountRole = async (accountId, roleId) => {
  try {
    const response = await axios.patch(
      `https://api.iuh.nagentech.com/api/auth/accounts/${accountId}`,
      { role: roleId },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating account role:', error.response.data);
    throw error;
  }
};

// Sử dụng
updateAccountRole('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439013');
```

## Các Role có sẵn trong hệ thống

| Role Name      | Mô tả                  |
| -------------- | ---------------------- |
| `ADMIN`        | Quản trị viên hệ thống |
| `CAMPUS_ADMIN` | Quản trị viên cơ sở    |
| `STAFF`        | Nhân viên              |
| `LECTURER`     | Giảng viên             |
| `STUDENT`      | Sinh viên              |
| `GUEST`        | Khách                  |

## Lưu ý quan trọng

1. **Quyền truy cập**: Chỉ Admin mới có quyền cập nhật role cho account
2. **Validation**:
   - Role ID phải là MongoDB ObjectId hợp lệ
   - Role phải tồn tại trong hệ thống
   - Email và phoneNumber phải unique (nếu cập nhật)
3. **Partial Update**: API hỗ trợ partial update, chỉ cần gửi các field muốn cập nhật
4. **Response**: API trả về thông tin account đã được cập nhật kèm theo thông tin role đã populate

## Ví dụ thực tế

### Ví dụ 1: Cập nhật role từ GUEST sang STUDENT

```bash
# 1. Lấy danh sách roles
GET /api/auth/roles
# Tìm role STUDENT, giả sử có _id = "507f1f77bcf86cd799439015"

# 2. Cập nhật role
PATCH /api/auth/accounts/507f1f77bcf86cd799439011
{
  "role": "507f1f77bcf86cd799439015"
}
```

### Ví dụ 2: Cập nhật role và thông tin khác cùng lúc

```bash
PATCH /api/auth/accounts/507f1f77bcf86cd799439011
{
  "role": "507f1f77bcf86cd799439013",
  "fullName": "Nguyễn Văn B",
  "phoneNumber": "0987654321"
}
```

## Troubleshooting

### Lỗi "Role không tồn tại"

- Kiểm tra lại role ID có đúng không
- Đảm bảo role ID là MongoDB ObjectId hợp lệ
- Kiểm tra role có tồn tại trong hệ thống bằng cách gọi `GET /api/auth/roles`

### Lỗi "Bạn không có quyền thực hiện thao tác này"

- Đảm bảo token có permission `ACCOUNT:ADMIN_ACTION`
- Kiểm tra role của user hiện tại có phải là ADMIN không

### Lỗi "Tài khoản không tồn tại"

- Kiểm tra account ID có đúng không
- Đảm bảo account ID là MongoDB ObjectId hợp lệ
