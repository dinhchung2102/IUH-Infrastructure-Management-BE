import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { RAGService } from '../services/rag.service';
import { ChatDto } from '../dtos/chat.dto';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Controller('ai/chat')
@UseGuards(AuthGuard)
export class AIChatController {
  constructor(private ragService: RAGService) {}

  @Post()
  async chat(@Body() dto: ChatDto, @CurrentUser() user: JwtPayload) {
    const result = await this.ragService.query(
      dto.query,
      {
        sourceTypes: dto.sourceTypes,
      },
      user.sub, // Pass user ID from token
    );

    return {
      success: true,
      data: {
        answer: result.answer,
        // sources: result.sources, // Hidden for cleaner response
        sourcesCount: result.sources.length,
      },
      meta: {
        usage: result.usage,
        timestamp: new Date(),
      },
    };
  }

  @Get('faq')
  async searchFAQ(@Query('q') query: string) {
    const result = await this.ragService.chatFAQ(query);

    return {
      success: true,
      data: {
        answer: result.answer,
        // sources: result.sources, // Hidden
        sourcesCount: result.sources.length,
      },
    };
  }

  @Get('facilities')
  async searchFacilities(@Query('q') query: string) {
    const result = await this.ragService.searchFacilities(query);

    return {
      success: true,
      data: {
        answer: result.answer,
        sourcesCount: result.sources.length,
      },
    };
  }

  @Get('sop')
  async searchSOPs(@Query('q') query: string) {
    const result = await this.ragService.searchSOPs(query);

    return {
      success: true,
      data: {
        answer: result.answer,
        sourcesCount: result.sources.length,
      },
    };
  }

  @Get('similar-reports')
  async searchSimilarReports(@Query('q') query: string) {
    const result = await this.ragService.searchSimilarReports(query);

    return {
      success: true,
      data: {
        answer: result.answer,
        sourcesCount: result.sources.length,
      },
    };
  }
}
