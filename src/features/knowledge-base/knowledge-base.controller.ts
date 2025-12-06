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
import { KnowledgeBaseService } from './knowledge-base.service';
import {
  CreateKnowledgeDto,
  UpdateKnowledgeDto,
  QueryKnowledgeDto,
} from './dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators';
import { Public } from '../auth/decorators/public.decorator';

@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeService: KnowledgeBaseService) {}

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['KNOWLEDGE:CREATE'])
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateKnowledgeDto) {
    return this.knowledgeService.create(createDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['KNOWLEDGE:CREATE'])
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  async bulkCreate(@Body() items: CreateKnowledgeDto[]) {
    return this.knowledgeService.bulkCreate(items);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['KNOWLEDGE:CREATE'])
  @Post('import-file')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async importFile(@UploadedFile() file: Express.Multer.File) {
    return this.knowledgeService.importFromFile(file);
  }

  @Public()
  @Get()
  async findAll(@Query() queryDto: QueryKnowledgeDto) {
    return this.knowledgeService.findAll(queryDto);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.knowledgeService.findOne(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['KNOWLEDGE:UPDATE'])
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() updateDto: UpdateKnowledgeDto) {
    return this.knowledgeService.update(id, updateDto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(['KNOWLEDGE:DELETE'])
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.knowledgeService.remove(id);
  }
}
