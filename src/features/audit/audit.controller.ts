import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import {
  FilesInterceptor,
  AnyFilesInterceptor,
} from '@nestjs/platform-express';
import { AuditService } from './audit.service';
import { CreateAuditLogDto } from './dto/create-auditlog.dto';
import { UpdateAuditLogDto } from './dto/update-auditlog.dto';
import { QueryAuditLogDto } from './dto/query-auditlog.dto';
import { StaffAuditLogDto } from './dto/staff-auditlog.dto';
import { CompleteAuditLogDto } from './dto/complete-auditlog.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UploadService } from '../../shared/upload/upload.service';

@Controller('audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly uploadService: UploadService,
  ) {}

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['AUDIT:CREATE'])
  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  @HttpCode(HttpStatus.CREATED)
  async createAuditLog(
    @Body() createAuditLogDto: CreateAuditLogDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.auditService.createAuditLog(createAuditLogDto, files);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['AUDIT:READ'])
  @Get()
  async findAllAuditLogs(@Query() queryDto: QueryAuditLogDto) {
    return this.auditService.findAllAuditLogs(queryDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['AUDIT:READ'])
  @Get(':id')
  async findOneAuditLog(@Param('id') id: string) {
    return this.auditService.findOneAuditLog(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['AUDIT:UPDATE'])
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateAuditLog(
    @Param('id') id: string,
    @Body() updateAuditLogDto: UpdateAuditLogDto,
  ) {
    return this.auditService.updateAuditLog(id, updateAuditLogDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['AUDIT:DELETE'])
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async removeAuditLog(@Param('id') id: string) {
    return this.auditService.removeAuditLog(id);
  }

  // ====== Upload ======
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['AUDIT:CREATE'])
  @Post('upload/images')
  @UseInterceptors(FilesInterceptor('images', 10)) // Tối đa 10 files
  async uploadAuditImages(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{ message: string; data: { urls: string[] } }> {
    const urls = await this.uploadService.uploadMultipleFiles(files);
    return {
      message: 'Upload ảnh audit thành công',
      data: { urls },
    };
  }

  // ====== Staff Audit Logs ======
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['AUDIT:READ'])
  @Get('staff/my-logs')
  async getMyAuditLogs(
    @CurrentUser('sub') staffId: string,
    @Query() queryDto: StaffAuditLogDto,
  ) {
    return this.auditService.getStaffAuditLogs(staffId, queryDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['AUDIT:UPDATE'])
  @Post('staff/accept-log/:auditId')
  @HttpCode(HttpStatus.OK)
  async acceptAuditLog(
    @Param('auditId') auditId: string,
    @CurrentUser('sub') staffId: string,
  ) {
    return this.auditService.acceptAuditLog(auditId, staffId);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['AUDIT:UPDATE'])
  @Post('staff/complete-log/:auditId')
  @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 images
  @HttpCode(HttpStatus.OK)
  async completeAuditLog(
    @Param('auditId') auditId: string,
    @CurrentUser('sub') staffId: string,
    @Body() completeDto: CompleteAuditLogDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.auditService.completeAuditLog(
      auditId,
      staffId,
      completeDto.notes,
      files,
    );
  }
}
