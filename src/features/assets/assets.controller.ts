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
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import {
  FileInterceptor,
  FilesInterceptor,
  AnyFilesInterceptor,
} from '@nestjs/platform-express';
import { AssetsService } from './assets.service';
import { CreateAssetCategoryDto } from './dto/asset-category/create-asset-category.dto';
import { UpdateAssetCategoryDto } from './dto/asset-category/update-asset-category.dto';
import { QueryAssetCategoryDto } from './dto/asset-category/query-asset-category.dto';
import { CreateAssetTypeDto } from './dto/asset-type/create-asset-type.dto';
import { UpdateAssetTypeDto } from './dto/asset-type/update-asset-type.dto';
import { QueryAssetTypeDto } from './dto/asset-type/query-asset-type.dto';
import { CreateAssetDto } from './dto/asset/create-asset.dto';
import { UpdateAssetDto } from './dto/asset/update-asset.dto';
import { QueryAssetDto } from './dto/asset/query-asset.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators';
import { UploadService } from '../../shared/upload/upload.service';

@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly uploadService: UploadService,
  ) {}

  // ====== Categories ======
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ASSET_CATEGORY:CREATE')
  @Post('categories')
  @UseInterceptors(AnyFilesInterceptor())
  async createCategory(
    @Body() dto: CreateAssetCategoryDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.assetsService.createCategory(dto, files);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ASSET_CATEGORY:READ')
  @Get('categories')
  async findAllCategories(@Query() query: QueryAssetCategoryDto) {
    return this.assetsService.findAllCategories(query);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ASSET_CATEGORY:READ')
  @Get('categories/:id')
  async findOneCategory(@Param('id') id: string) {
    return this.assetsService.findOneCategory(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ASSET_CATEGORY:UPDATE')
  @Patch('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateAssetCategoryDto,
  ) {
    return this.assetsService.updateCategory(id, dto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ASSET_CATEGORY:DELETE')
  @Delete('categories/:id')
  async removeCategory(@Param('id') id: string) {
    return this.assetsService.removeCategory(id);
  }

  // ====== Types ======
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ASSET_TYPE:CREATE')
  @Post('types')
  async createType(@Body() dto: CreateAssetTypeDto) {
    return this.assetsService.createType(dto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ASSET_TYPE:READ')
  @Get('types')
  async findAllTypes(@Query() query: QueryAssetTypeDto) {
    return this.assetsService.findAllTypes(query);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ASSET_TYPE:READ')
  @Get('types/:id')
  async findOneType(@Param('id') id: string) {
    return this.assetsService.findOneType(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ASSET_TYPE:UPDATE')
  @Patch('types/:id')
  async updateType(@Param('id') id: string, @Body() dto: UpdateAssetTypeDto) {
    return this.assetsService.updateType(id, dto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ASSET_TYPE:DELETE')
  @Delete('types/:id')
  async removeType(@Param('id') id: string) {
    return this.assetsService.removeType(id);
  }

  // ====== Assets ======
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ASSET:CREATE')
  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  async createAsset(
    @Body() dto: CreateAssetDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.assetsService.createAsset(dto, files);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ASSET:READ')
  @Get()
  async findAllAssets(@Query() query: QueryAssetDto) {
    return this.assetsService.findAllAssets(query);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ASSET:READ')
  @Get(':id')
  async findOneAsset(@Param('id') id: string) {
    return this.assetsService.findOneAsset(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ASSET:UPDATE')
  @Patch(':id')
  async updateAsset(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.updateAsset(id, dto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ASSET:DELETE')
  @Delete(':id')
  async removeAsset(@Param('id') id: string) {
    return this.assetsService.removeAsset(id);
  }

  // ====== Upload ======
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ASSET:CREATE', 'ASSET:UPDATE')
  @Post('upload/image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadAssetImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ message: string; data: { url: string } }> {
    const url = await this.uploadService.uploadFile(file);
    return {
      message: 'Upload ảnh tài sản thành công',
      data: { url },
    };
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ASSET_CATEGORY:CREATE', 'ASSET_CATEGORY:UPDATE')
  @Post('categories/upload/image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadCategoryImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ message: string; data: { url: string } }> {
    const url = await this.uploadService.uploadFile(file);
    return {
      message: 'Upload ảnh loại tài sản thành công',
      data: { url },
    };
  }
}
