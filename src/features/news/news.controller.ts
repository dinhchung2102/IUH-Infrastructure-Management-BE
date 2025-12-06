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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
  @UseInterceptors(
    FileInterceptor('thumbnail', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async create(
    @Body() createNewsDto: CreateNewsDto,
    @UploadedFile() thumbnailFile?: Express.Multer.File,
  ) {
    return this.newsService.create(createNewsDto, thumbnailFile);
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
  @UseInterceptors(
    FileInterceptor('thumbnail', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() updateNewsDto: UpdateNewsDto,
    @UploadedFile() thumbnailFile?: Express.Multer.File,
  ) {
    return this.newsService.update(id, updateNewsDto, thumbnailFile);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['NEWS:DELETE', 'NEWS:ADMIN_ACTION'])
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.newsService.remove(id);
  }
}
