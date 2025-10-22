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
import {
  CreateNewsCategoryDto,
  UpdateNewsCategoryDto,
  QueryNewsCategoryDto,
} from './dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators';
import { Public } from '../auth/decorators/public.decorator';

@Controller('news-categories')
export class NewsCategoryController {
  constructor(private readonly newsService: NewsService) {}

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['NEWS:CREATE', 'NEWS:ADMIN_ACTION'])
  @Post()
  async create(@Body() createNewsCategoryDto: CreateNewsCategoryDto) {
    return this.newsService.createCategory(createNewsCategoryDto);
  }

  @Public()
  @Get()
  async findAll(@Query() queryDto: QueryNewsCategoryDto) {
    return this.newsService.findAllCategories(queryDto);
  }

  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.newsService.findCategoryBySlug(slug);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.newsService.findOneCategory(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['NEWS:UPDATE', 'NEWS:ADMIN_ACTION'])
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateNewsCategoryDto: UpdateNewsCategoryDto,
  ) {
    return this.newsService.updateCategory(id, updateNewsCategoryDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['NEWS:DELETE', 'NEWS:ADMIN_ACTION'])
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.newsService.removeCategory(id);
  }
}
