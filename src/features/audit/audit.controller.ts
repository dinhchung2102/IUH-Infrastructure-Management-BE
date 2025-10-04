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
import { AuditService } from './audit.service';
import { CreateAuditLogDto } from './dto/create-auditlog.dto';
import { UpdateAuditLogDto } from './dto/update-auditlog.dto';
import { QueryAuditLogDto } from './dto/query-auditlog.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('AUDIT:CREATE')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAuditLog(
    @Body() createAuditLogDto: CreateAuditLogDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.auditService.createAuditLog(createAuditLogDto, user.sub);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('AUDIT:READ')
  @Get()
  async findAllAuditLogs(@Query() queryDto: QueryAuditLogDto) {
    return this.auditService.findAllAuditLogs(queryDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('AUDIT:READ')
  @Get(':id')
  async findOneAuditLog(@Param('id') id: string) {
    return this.auditService.findOneAuditLog(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('AUDIT:UPDATE')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateAuditLog(
    @Param('id') id: string,
    @Body() updateAuditLogDto: UpdateAuditLogDto,
  ) {
    return this.auditService.updateAuditLog(id, updateAuditLogDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('AUDIT:DELETE')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async removeAuditLog(@Param('id') id: string) {
    return this.auditService.removeAuditLog(id);
  }
}
