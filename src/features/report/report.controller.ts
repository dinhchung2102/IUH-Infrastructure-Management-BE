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
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { QueryReportDto } from './dto/query-report.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UploadService } from '../../shared/upload/upload.service';

@Controller('report')
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly uploadService: UploadService,
  ) {}

  @UseGuards(AuthGuard, PermissionsGuard)
  // @RequirePermissions('REPORT:CREATE')
  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  @HttpCode(HttpStatus.CREATED)
  async createReport(
    @Body() createReportDto: CreateReportDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.reportService.createReport(createReportDto, user.sub, files);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('REPORT:READ')
  @Get()
  async findAllReports(@Query() queryDto: QueryReportDto) {
    return this.reportService.findAllReports(queryDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('REPORT:READ')
  @Get(':id')
  async findOneReport(@Param('id') id: string) {
    return this.reportService.findOneReport(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('REPORT:UPDATE')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateReport(
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
  ) {
    return this.reportService.updateReport(id, updateReportDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('REPORT:DELETE')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async removeReport(@Param('id') id: string) {
    return this.reportService.removeReport(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('REPORT:READ')
  @Get('statistics/dashboard')
  async getReportStatistics() {
    return this.reportService.getReportStatistics();
  }

  // ====== Upload ======
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('REPORT:CREATE')
  @Post('upload/images')
  @UseInterceptors(FilesInterceptor('images', 10)) // Tối đa 10 files
  async uploadReportImages(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{ message: string; data: { urls: string[] } }> {
    const urls = await this.uploadService.uploadMultipleFiles(files);
    return {
      message: 'Upload ảnh báo cáo thành công',
      data: { urls },
    };
  }
}
