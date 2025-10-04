import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { AuthGuard } from '../../features/auth/guards/auth.guard';
import { PermissionsGuard } from '../../features/auth/guards/permissions.guard';
import { RequirePermissions } from '../../features/auth/decorators/require-permissions.decorator';

@Controller('upload')
@UseGuards(AuthGuard, PermissionsGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  @RequirePermissions('ASSET:CREATE', 'ASSET:UPDATE')
  async uploadSingleFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ message: string; data: { url: string } }> {
    const url = await this.uploadService.uploadFile(file);
    return {
      message: 'Upload file thành công',
      data: { url },
    };
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10)) // Tối đa 10 files
  @RequirePermissions(
    'ASSET:CREATE',
    'ASSET:UPDATE',
    'AUDIT:CREATE',
    'REPORT:CREATE',
  )
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{ message: string; data: { urls: string[] } }> {
    const urls = await this.uploadService.uploadMultipleFiles(files);
    return {
      message: 'Upload files thành công',
      data: { urls },
    };
  }
}
