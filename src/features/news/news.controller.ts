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
import { NewsService } from './news.service';
import { CreateNewsDto, UpdateNewsDto, QueryNewsDto } from './dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators';
import { Public } from '../auth/decorators/public.decorator';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['NEWS:CREATE', 'NEWS:ADMIN_ACTION'])
  @Post()
  async create(@Body() createNewsDto: CreateNewsDto) {
    return this.newsService.create(createNewsDto);
  }

  @Public()
  @Get()
  async findAll(@Query() queryDto: QueryNewsDto) {
    return this.newsService.findAll(queryDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['NEWS:READ', 'NEWS:ADMIN_ACTION'])
  @Get('stats')
  async getNewsStats() {
    return this.newsService.getNewsStats();
  }

  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.newsService.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.newsService.findOne(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['NEWS:UPDATE', 'NEWS:ADMIN_ACTION'])
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateNewsDto: UpdateNewsDto) {
    return this.newsService.update(id, updateNewsDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['NEWS:DELETE', 'NEWS:ADMIN_ACTION'])
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.newsService.remove(id);
  }
}
