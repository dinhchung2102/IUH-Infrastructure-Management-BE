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
} from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { QueryReportDto } from './dto/query-report.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @UseGuards(AuthGuard, PermissionsGuard)
  // @RequirePermissions('REPORT:CREATE')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createReport(
    @Body() createReportDto: CreateReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportService.createReport(createReportDto, user.sub);
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
}
