import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators';

@Controller('dashboard')
@UseGuards(AuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @RequirePermissions(['ACCOUNT:ADMIN_ACTION', 'ACCOUNT:ALL'], 'OR')
  async getDashboardStats() {
    return this.dashboardService.getDashboardStats();
  }
}
