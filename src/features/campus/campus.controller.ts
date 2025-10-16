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
import { CampusService } from './campus.service';
import { CreateCampusDto, UpdateCampusDto, QueryCampusDto } from './dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators';
import { Public } from '../auth/decorators/public.decorator';

@Controller('campus')
export class CampusController {
  constructor(private readonly campusService: CampusService) {}

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('CAMPUS:CREATE')
  @Post()
  async create(@Body() createCampusDto: CreateCampusDto) {
    return this.campusService.create(createCampusDto);
  }

  @Public()
  @Get()
  async findAll(@Query() queryDto: QueryCampusDto) {
    return this.campusService.findAll(queryDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('CAMPUS:READ')
  @Get('stats')
  async getCampusStats() {
    return this.campusService.getCampusStats();
  }

  @Public()
  async findOne(@Param('id') id: string) {
    return this.campusService.findOne(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('CAMPUS:UPDATE')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCampusDto: UpdateCampusDto,
  ) {
    return this.campusService.update(id, updateCampusDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('CAMPUS:DELETE')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.campusService.remove(id);
  }
}
