import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadPath: string;

  constructor(private readonly configService: ConfigService) {
    // Use dist/uploads in production, uploads in development
    const basePath =
      process.env.NODE_ENV === 'production'
        ? join(process.cwd(), 'dist', 'uploads')
        : join(process.cwd(), 'uploads');
    this.uploadPath = basePath;
    // Initialize directory asynchronously (non-blocking)
    void this.ensureUploadDirectoryExists();
    this.logger.log(`Upload directory: ${this.uploadPath}`);
  }

  private async ensureUploadDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.uploadPath);
      this.logger.log(`Upload directory exists: ${this.uploadPath}`);
    } catch {
      try {
        await fs.mkdir(this.uploadPath, { recursive: true });
        this.logger.log(`Created upload directory: ${this.uploadPath}`);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Failed to create upload directory: ${errorMessage}`,
          errorStack,
        );
        throw new BadRequestException(
          `Không thể tạo thư mục upload: ${errorMessage}`,
        );
      }
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

    // Kiểm tra kích thước file (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('Kích thước file quá lớn. Tối đa 10MB');
    }

    // Tạo tên file unique
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.originalname.split('.').pop() || 'jpg';
    const fileName = `${timestamp}-${randomString}.${fileExtension}`;
    const filePath = join(this.uploadPath, fileName);

    this.logger.debug(
      `Uploading file: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB) to ${filePath}`,
    );

    try {
      // Đảm bảo thư mục tồn tại trước khi ghi
      await this.ensureUploadDirectoryExists();

      await fs.writeFile(filePath, file.buffer);
      this.logger.log(`File uploaded successfully: ${fileName}`);
      return `/uploads/${fileName}`;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to save file: ${errorMessage}`, errorStack);
      this.logger.error(`File path: ${filePath}`);
      this.logger.error(`Upload path: ${this.uploadPath}`);

      // Kiểm tra quyền ghi
      try {
        await fs.access(this.uploadPath, fs.constants.W_OK);
      } catch (accessError: unknown) {
        const accessErrorMessage =
          accessError instanceof Error
            ? accessError.message
            : String(accessError);
        throw new BadRequestException(
          `Không có quyền ghi vào thư mục upload: ${accessErrorMessage}`,
        );
      }

      throw new BadRequestException(
        `Lỗi khi lưu file: ${errorMessage}. Vui lòng kiểm tra logs để biết thêm chi tiết.`,
      );
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
    } catch {
      // Không throw error nếu file không tồn tại
      this.logger.warn(`Không thể xóa file: ${filePath}`);
    }
  }
}
