import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { QueryMaintenanceDto } from './dto/query-maintenance.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from '../../shared/upload/upload.service';

@Controller('maintenance')
export class MaintenanceController {
  constructor(
    private readonly maintenanceService: MaintenanceService,
    private readonly uploadService: UploadService,
  ) {}

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['MAINTENANCE:CREATE'])
  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  async create(
    @Body() createMaintenanceDto: CreateMaintenanceDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    // Handle file uploads if any
    if (files && files.length > 0) {
      const imageFiles = files.filter((file) => file.fieldname === 'images');
      if (imageFiles.length > 0) {
        const imageUrls =
          await this.uploadService.uploadMultipleFiles(imageFiles);
        createMaintenanceDto.images = [
          ...(createMaintenanceDto.images || []),
          ...imageUrls,
        ];
      }
    }

    return this.maintenanceService.create(createMaintenanceDto, user.sub);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['MAINTENANCE:READ'])
  @Get()
  async findAll(@Query() query: QueryMaintenanceDto) {
    return this.maintenanceService.findAll(query);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['MAINTENANCE:READ'])
  @Get('overdue')
  async getOverdue() {
    return this.maintenanceService.getOverdueMaintenances();
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['MAINTENANCE:READ'])
  @Get('upcoming')
  async getUpcoming(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 7;
    return this.maintenanceService.getUpcomingMaintenances(daysNum);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['MAINTENANCE:READ'])
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.maintenanceService.findOne(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['MAINTENANCE:UPDATE'])
  @Patch(':id')
  @UseInterceptors(AnyFilesInterceptor())
  async update(
    @Param('id') id: string,
    @Body() updateMaintenanceDto: UpdateMaintenanceDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    // Handle file uploads if any
    if (files && files.length > 0) {
      const imageFiles = files.filter((file) => file.fieldname === 'images');
      if (imageFiles.length > 0) {
        const imageUrls =
          await this.uploadService.uploadMultipleFiles(imageFiles);
        updateMaintenanceDto.images = [
          ...(updateMaintenanceDto.images || []),
          ...imageUrls,
        ];
      }
    }

    return this.maintenanceService.update(id, updateMaintenanceDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['MAINTENANCE:DELETE'])
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.maintenanceService.remove(id);
  }
}
