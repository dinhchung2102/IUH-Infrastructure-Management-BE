import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ClassificationService } from '../services/classification.service';
import { ClassifyReportDto } from '../dtos/classify-report.dto';
import { AuthGuard } from '../../auth/guards/auth.guard';

@Controller('ai/classify')
@UseGuards(AuthGuard)
export class AIClassificationController {
  constructor(private classificationService: ClassificationService) {}

  @Post('report')
  async classifyReport(@Body() dto: ClassifyReportDto) {
    const classification = await this.classificationService.classifyReport(
      dto.description,
      dto.location,
    );

    return {
      success: true,
      data: classification,
      message: 'Phân loại báo cáo thành công',
    };
  }

  @Post('suggest-priority')
  async suggestPriority(@Body() dto: ClassifyReportDto) {
    const priority = await this.classificationService.suggestPriority(
      dto.description,
    );

    return {
      success: true,
      data: { priority },
      message: 'Đề xuất độ ưu tiên thành công',
    };
  }
}
