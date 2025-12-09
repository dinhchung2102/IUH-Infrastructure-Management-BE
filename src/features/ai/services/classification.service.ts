import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { RAGService } from './rag.service';
import type { AIService } from '../interfaces/ai-service.interface';

export interface ClassificationResult {
  category: string;
  priority: string;
  suggestedStaffSkills: string[];
  estimatedDuration: number; // minutes
  processingDays: number; // Số ngày xử lý gợi ý (từ lúc được phê duyệt)
  reasoning: string;
  confidence: number;
}

@Injectable()
export class ClassificationService {
  private readonly logger = new Logger(ClassificationService.name);

  constructor(
    @Inject('AIService') private aiService: AIService,
    @Inject(forwardRef(() => RAGService))
    private ragService?: RAGService,
  ) {}

  /**
   * Phân loại report tự động bằng AI
   * @param description Mô tả sự cố
   * @param location Địa điểm (optional)
   * @returns Classification result
   */
  async classifyReport(
    description: string,
    location?: string,
  ): Promise<ClassificationResult> {
    try {
      this.logger.log(
        `Classifying report: "${description.substring(0, 50)}..."`,
      );

      // Lấy quy định thời gian xử lý từ RAG knowledge base (nếu có)
      let processingTimeContext = '';
      if (this.ragService) {
        try {
          // Thử tìm với filter regulation trước (lowercase vì sync service lưu lowercase)
          let ragResult = await this.ragService.query(
            `quy định thời gian xử lý sự cố ${description}`,
            {
              sourceTypes: ['regulation'],
              topK: 3,
              minScore: 0.3,
            },
          );

          // Nếu không tìm thấy với filter, thử lại không có filter để tìm trong tất cả knowledge
          if (!ragResult.sources || ragResult.sources.length === 0) {
            this.logger.log(
              'No regulation documents found with filter, trying without filter...',
            );
            ragResult = await this.ragService.query(
              `quy định thời gian xử lý sự cố ${description}`,
              {
                topK: 5,
                minScore: 0.3,
              },
            );
          }

          if (ragResult.sources && ragResult.sources.length > 0) {
            // Lọc chỉ lấy các documents có type là regulation hoặc có từ khóa liên quan
            const relevantSources = ragResult.sources.filter((s) => {
              const metadata = s.metadata as
                | { type?: string; category?: string }
                | undefined;
              const type = metadata?.type?.toLowerCase() || '';
              const category = metadata?.category || '';
              const content = s.content.toLowerCase();

              return (
                type === 'regulation' ||
                category.includes('processing-time') ||
                content.includes('thời gian xử lý') ||
                content.includes('processing') ||
                content.includes('ngày')
              );
            });

            if (relevantSources.length > 0) {
              processingTimeContext = `\n\nQUY ĐỊNH THỜI GIAN XỬ LÝ TỪ CƠ SỞ DỮ LIỆU:\n${relevantSources.map((s, i) => `[${i + 1}] ${s.content}`).join('\n\n')}`;
              this.logger.log(
                `Retrieved ${relevantSources.length} relevant documents from RAG`,
              );
            }
          }
        } catch (ragError: unknown) {
          const errorMessage =
            ragError instanceof Error ? ragError.message : String(ragError);
          this.logger.warn(
            `Failed to retrieve processing time regulations from RAG: ${errorMessage}`,
          );
          // Không throw error, tiếp tục với default logic
        }
      }

      const prompt = this.buildClassificationPrompt(
        description,
        location,
        processingTimeContext,
      );

      const response = await this.aiService.chatCompletion(
        [{ role: 'user', content: prompt }],
        { temperature: 0.2, maxTokens: 500 },
      );

      // Parse JSON response
      const jsonText = response.content
        .replace(/```json\n?|\n?```/g, '')
        .trim();
      const classification = JSON.parse(jsonText) as {
        category?: string;
        priority?: string;
        suggestedStaffSkills?: string[];
        estimatedDuration?: number;
        processingDays?: number;
        reasoning?: string;
        confidence?: number;
      };

      this.logger.log(
        `Classification result: ${classification.category || 'UNKNOWN'} - ${classification.priority || 'UNKNOWN'}`,
      );

      const priority = classification.priority || 'MEDIUM';
      return {
        category: classification.category || 'KHAC',
        priority,
        suggestedStaffSkills: classification.suggestedStaffSkills || [],
        estimatedDuration: classification.estimatedDuration || 60,
        processingDays:
          classification.processingDays ||
          this.calculateDefaultProcessingDays(priority),
        reasoning: classification.reasoning || 'Phân loại tự động',
        confidence: classification.confidence || 0.8,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error classifying report: ${errorMessage}`,
        errorStack,
      );

      // Fallback to default classification
      return {
        category: 'KHAC',
        priority: 'MEDIUM',
        suggestedStaffSkills: [],
        estimatedDuration: 60,
        processingDays: 3, // Default 3 ngày
        reasoning: 'Không thể phân loại tự động',
        confidence: 0.5,
      };
    }
  }

  /**
   * Suggest priority based on keywords
   * @param description Report description
   * @returns Suggested priority
   */
  async suggestPriority(description: string): Promise<string> {
    try {
      const classification = await this.classifyReport(description);
      return classification.priority;
    } catch {
      return 'MEDIUM';
    }
  }

  /**
   * Build classification prompt cho Gemini
   * @param description Report description
   * @param location Location (optional)
   * @returns Formatted prompt
   */
  private buildClassificationPrompt(
    description: string,
    location?: string,
    processingTimeContext?: string,
  ): string {
    return `
Bạn là hệ thống AI phân loại báo cáo sự cố tại Trường Đại học Công nghiệp TP.HCM.

MÔ TẢ SỰ CỐ:
${description}

${location ? `ĐỊA ĐIỂM: ${location}` : ''}

YÊU CẦU: Phân tích và trả về JSON với format chính xác:
{
  "category": "DIEN|NUOC|MANG|NOI_THAT|DIEU_HOA|VE_SINH|AN_NINH|KHAC",
  "priority": "CRITICAL|HIGH|MEDIUM|LOW",
  "suggestedStaffSkills": ["skill1", "skill2"],
  "estimatedDuration": 60,
  "processingDays": 3,
  "reasoning": "Lý do phân loại",
  "confidence": 0.85
}

CATEGORIES (LOẠI SỰ CỐ):
- DIEN: Sự cố về điện (mất điện, chập điện, bóng đèn, công tắc, ổ cắm)
- NUOC: Sự cố về nước (rò rỉ, tắc nghẽn, vòi nước, nhà vệ sinh)
- MANG: Sự cố về mạng Internet, WiFi, hệ thống mạng
- NOI_THAT: Bàn ghế, cửa sổ, bảng, tủ, thiết bị nội thất
- DIEU_HOA: Điều hòa nhiệt độ, quạt, hệ thống làm mát
- VE_SINH: Vệ sinh, rác thải, môi trường
- AN_NINH: An ninh, cửa ra vào, khóa, camera
- KHAC: Các vấn đề khác không thuộc danh mục trên

PRIORITIES (ĐỘ ƯU TIÊN):
- CRITICAL: Nguy hiểm tính mạng, cháy nổ, điện giật, nước tràn lớn, ảnh hưởng nghiêm trọng
- HIGH: Ảnh hưởng nhiều người, phòng học/lab, cần xử lý trong ngày
- MEDIUM: Ảnh hưởng ít người, không cần xử lý gấp, có thể đợi 1-2 ngày
- LOW: Vấn đề nhỏ, không ảnh hưởng sử dụng, có thể xử lý sau

SUGGESTED SKILLS (KỸ NĂNG ĐỀ XUẤT):
- Điện: ["electrician", "electrical_safety"]
- Nước: ["plumber", "water_system"]
- Mạng: ["network_technician", "it_support"]
- Nội thất: ["carpenter", "general_maintenance"]
- Điều hòa: ["hvac_technician", "air_conditioning"]
- Vệ sinh: ["cleaning_staff", "waste_management"]
- An ninh: ["security", "lock_repair"]

ESTIMATED DURATION (phút):
- Dựa vào độ phức tạp: 15-30 phút (đơn giản), 30-120 phút (trung bình), 120+ phút (phức tạp)

PROCESSING DAYS (Số ngày xử lý từ lúc được phê duyệt):
- CRITICAL: 1-2 ngày (cần xử lý gấp)
- HIGH: 2-3 ngày (xử lý trong vài ngày)
- MEDIUM: 3-5 ngày (xử lý trong tuần)
- LOW: 5-7 ngày (có thể xử lý sau)
- Dựa vào độ phức tạp và ưu tiên để đưa ra số ngày hợp lý
${processingTimeContext || ''}

QUAN TRỌNG: Nếu có quy định thời gian xử lý từ cơ sở dữ liệu ở trên, HÃY ƯU TIÊN SỬ DỤNG quy định đó để đưa ra processingDays chính xác nhất. Nếu không có, sử dụng quy tắc mặc định ở trên.

CHỈ TRẢ VỀ JSON, KHÔNG THÊM TEXT KHÁC.
    `.trim();
  }

  /**
   * Tính số ngày xử lý mặc định dựa trên priority
   * @param priority Priority level
   * @returns Số ngày xử lý
   */
  private calculateDefaultProcessingDays(priority: string): number {
    switch (priority) {
      case 'CRITICAL':
        return 1;
      case 'HIGH':
        return 2;
      case 'MEDIUM':
        return 3;
      case 'LOW':
        return 5;
      default:
        return 3;
    }
  }
}
