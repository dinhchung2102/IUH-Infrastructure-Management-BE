import { Injectable } from '@nestjs/common';
import { ZoneAreaMainService } from './zone-area-main.service';
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

@Injectable()
export class ZoneAreaService {
  constructor(private readonly mainService: ZoneAreaMainService) {}

  // ==================== AREA METHODS ====================

  async createArea(createAreaDto: CreateAreaDto) {
    return this.mainService.createArea(createAreaDto);
  }

  async findAllAreas(queryDto: QueryAreaDto) {
    return this.mainService.findAllAreas(queryDto);
  }

  async findOneArea(id: string) {
    return this.mainService.findOneArea(id);
  }

  async updateArea(id: string, updateAreaDto: UpdateAreaDto) {
    return this.mainService.updateArea(id, updateAreaDto);
  }

  async removeArea(id: string) {
    return this.mainService.removeArea(id);
  }

  // ==================== BUILDING METHODS ====================

  async createBuilding(createBuildingDto: CreateBuildingDto) {
    return this.mainService.createBuilding(createBuildingDto);
  }

  async findAllBuildings(queryDto: QueryBuildingDto) {
    return this.mainService.findAllBuildings(queryDto);
  }

  async findOneBuilding(id: string) {
    return this.mainService.findOneBuilding(id);
  }

  async updateBuilding(id: string, updateBuildingDto: UpdateBuildingDto) {
    return this.mainService.updateBuilding(id, updateBuildingDto);
  }

  async removeBuilding(id: string) {
    return this.mainService.removeBuilding(id);
  }

  // ==================== ZONE METHODS ====================

  async createZone(createZoneDto: CreateZoneDto) {
    return this.mainService.createZone(createZoneDto);
  }

  async findAllZones(queryDto: QueryZoneDto) {
    return this.mainService.findAllZones(queryDto);
  }

  async findAllZonesByBuildingFloor(buildingId: string, floor: number) {
    return this.mainService.findAllZonesByBuildingAndFloor(buildingId, floor);
  }

  async findOneZone(id: string) {
    return this.mainService.findOneZone(id);
  }

  async updateZone(id: string, updateZoneDto: UpdateZoneDto) {
    return this.mainService.updateZone(id, updateZoneDto);
  }

  async removeZone(id: string) {
    return this.mainService.removeZone(id);
  }

  async findAllZonesByBuilding(buildingId: string) {
    return this.mainService.findAllZonesByBuilding(buildingId);
  }

  async findAllBuildingsByCampus(campusId: string) {
    return this.mainService.findAllBuildingsByCampus(campusId);
  }

  async findAllAreasByCampus(campusId: string) {
    return this.mainService.findAllAreasByCampus(campusId);
  }
}
