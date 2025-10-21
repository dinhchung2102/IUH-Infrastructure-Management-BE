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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ZoneAreaService } from './zone-area.service';
import {
  CreateAreaDto,
  UpdateAreaDto,
  QueryAreaDto,
  CreateBuildingDto,
  UpdateBuildingDto,
  QueryBuildingDto,
  CreateZoneDto,
  UpdateZoneDto,
  QueryZoneDto,
} from './dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators';
import { Public } from '../auth/decorators/public.decorator';

@Controller('zone-area')
export class ZoneAreaController {
  constructor(private readonly zoneAreaService: ZoneAreaService) {}

  // ==================== AREA ENDPOINTS ====================

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['AREA:CREATE'])
  @Post('areas')
  async createArea(@Body() createAreaDto: CreateAreaDto) {
    return this.zoneAreaService.createArea(createAreaDto);
  }

  @Public()
  @Get('areas')
  async findAllAreas(@Query() queryDto: QueryAreaDto) {
    return this.zoneAreaService.findAllAreas(queryDto);
  }

  @Public()
  @Get('areas/:id')
  async findOneArea(@Param('id') id: string) {
    return this.zoneAreaService.findOneArea(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['AREA:UPDATE'])
  @Patch('areas/:id')
  async updateArea(
    @Param('id') id: string,
    @Body() updateAreaDto: UpdateAreaDto,
  ) {
    return this.zoneAreaService.updateArea(id, updateAreaDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['AREA:DELETE'])
  @Delete('areas/:id')
  @HttpCode(HttpStatus.OK)
  async removeArea(@Param('id') id: string) {
    return this.zoneAreaService.removeArea(id);
  }

  // ==================== BUILDING ENDPOINTS ====================

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['BUILDING:CREATE'])
  @Post('buildings')
  async createBuilding(@Body() createBuildingDto: CreateBuildingDto) {
    return this.zoneAreaService.createBuilding(createBuildingDto);
  }

  @Public()
  @Get('buildings')
  async findAllBuildings(@Query() queryDto: QueryBuildingDto) {
    return this.zoneAreaService.findAllBuildings(queryDto);
  }

  @Public()
  @Get('buildings/:id')
  async findOneBuilding(@Param('id') id: string) {
    return this.zoneAreaService.findOneBuilding(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['BUILDING:UPDATE'])
  @Patch('buildings/:id')
  async updateBuilding(
    @Param('id') id: string,
    @Body() updateBuildingDto: UpdateBuildingDto,
  ) {
    return this.zoneAreaService.updateBuilding(id, updateBuildingDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['BUILDING:DELETE'])
  @Delete('buildings/:id')
  @HttpCode(HttpStatus.OK)
  async removeBuilding(@Param('id') id: string) {
    return this.zoneAreaService.removeBuilding(id);
  }

  // ==================== ZONE ENDPOINTS ====================

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ZONE:CREATE'])
  @Post('zones')
  async createZone(@Body() createZoneDto: CreateZoneDto) {
    return this.zoneAreaService.createZone(createZoneDto);
  }

  @Public()
  @Get('zones')
  async findAllZones(@Query() queryDto: QueryZoneDto) {
    return this.zoneAreaService.findAllZones(queryDto);
  }

  @Public()
  @Get('zones/:id')
  async findOneZone(@Param('id') id: string) {
    return this.zoneAreaService.findOneZone(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ZONE:UPDATE'])
  @Patch('zones/:id')
  async updateZone(
    @Param('id') id: string,
    @Body() updateZoneDto: UpdateZoneDto,
  ) {
    return this.zoneAreaService.updateZone(id, updateZoneDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['ZONE:DELETE'])
  @Delete('zones/:id')
  @HttpCode(HttpStatus.OK)
  async removeZone(@Param('id') id: string) {
    return this.zoneAreaService.removeZone(id);
  }

  @Public()
  @Get('buildings/:buildingId/zones')
  async findAllZonesByBuilding(@Param('buildingId') buildingId: string) {
    return this.zoneAreaService.findAllZonesByBuilding(buildingId);
  }

  @Public()
  @Get('campus/:campusId/buildings')
  async findAllBuildingsByCampus(@Param('campusId') campusId: string) {
    return this.zoneAreaService.findAllBuildingsByCampus(campusId);
  }

  @Public()
  @Get('buildings/:buildingId/zones/floor/:floor')
  async findAllZonesByBuildingAndFloor(
    @Param('buildingId') buildingId: string,
    @Param('floor') floor: number,
  ) {
    return this.zoneAreaService.findAllZonesByBuildingFloor(buildingId, floor);
  }

  @Public()
  @Get('campus/:campusId/areas')
  async findAllAreasByCampus(@Param('campusId') campusId: string) {
    return this.zoneAreaService.findAllAreasByCampus(campusId);
  }

  // ==================== STATISTICS ENDPOINTS ====================

  @Public()
  @Get('buildings-stats')
  async getBuildingStats() {
    return this.zoneAreaService.getBuildingStats();
  }

  @Public()
  @Get('areas-stats')
  async getAreaStats() {
    return this.zoneAreaService.getAreaStats();
  }

  @Public()
  @Get('zones-stats')
  async getZoneStats() {
    return this.zoneAreaService.getZoneStats();
  }
}
