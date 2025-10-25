import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadService {
  private readonly uploadPath: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadPath = join(process.cwd(), 'uploads');
    this.ensureUploadDirectoryExists();
  }

  private async ensureUploadDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.uploadPath);
    } catch {
      await fs.mkdir(this.uploadPath, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('Không có file được upload');
    }

    // Kiểm tra định dạng file
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Định dạng file không được hỗ trợ. Chỉ chấp nhận: JPEG, PNG, GIF, WebP',
      );
    }

    // Kiểm tra kích thước file (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('Kích thước file quá lớn. Tối đa 5MB');
    }

    // Tạo tên file unique
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${timestamp}-${randomString}.${fileExtension}`;
    const filePath = join(this.uploadPath, fileName);

    try {
      await fs.writeFile(filePath, file.buffer);
      return `/uploads/${fileName}`;
    } catch (error) {
      throw new BadRequestException('Lỗi khi lưu file');
    }
  }

  async uploadMultipleFiles(files: Express.Multer.File[]): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Không có file nào được upload');
    }

    const uploadPromises = files.map((file) => this.uploadFile(file));
    return Promise.all(uploadPromises);
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = join(process.cwd(), filePath);
      await fs.unlink(fullPath);
    } catch (error) {
      // Không throw error nếu file không tồn tại
      console.warn(`Không thể xóa file: ${filePath}`);
    }
  }
}
