import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from '../services/gemini.service';
import { OpenAIService } from '../services/openai.service';
import { AIService } from '../interfaces/ai-service.interface';

/**
 * Factory provider để chọn AI service dựa trên biến AI trong .env
 * AI=gemini -> GeminiService
 * AI=openai -> OpenAIService
 * Default: openai
 */
export const AIServiceProvider: Provider = {
  provide: 'AIService',
  useFactory: (
    configService: ConfigService,
    geminiService: GeminiService,
    openaiService: OpenAIService,
  ): AIService => {
    const aiProvider =
      configService.get<string>('AI')?.toLowerCase() || 'openai';

    if (aiProvider === 'gemini') {
      return geminiService;
    } else if (aiProvider === 'openai') {
      return openaiService;
    } else {
      // Default to OpenAI
      return openaiService;
    }
  },
  inject: [ConfigService, GeminiService, OpenAIService],
};
