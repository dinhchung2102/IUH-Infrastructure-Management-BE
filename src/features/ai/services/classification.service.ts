import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from './gemini.service';

export interface ClassificationResult {
  category: string;
  priority: string;
  suggestedStaffSkills: string[];
  estimatedDuration: number; // minutes
  reasoning: string;
  confidence: number;
}

@Injectable()
export class ClassificationService {
  private readonly logger = new Logger(ClassificationService.name);

  constructor(private geminiService: GeminiService) {}

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

      const prompt = this.buildClassificationPrompt(description, location);

      const response = await this.geminiService.chatCompletion(
        [{ role: 'user', content: prompt }],
        { temperature: 0.2, maxTokens: 500 },
      );

      // Parse JSON response
      const jsonText = response.content
        .replace(/```json\n?|\n?```/g, '')
        .trim();
      const classification = JSON.parse(jsonText);

      this.logger.log(
        `Classification result: ${classification.category} - ${classification.priority}`,
      );

      return {
        category: classification.category,
        priority: classification.priority,
        suggestedStaffSkills: classification.suggestedStaffSkills || [],
        estimatedDuration: classification.estimatedDuration || 60,
        reasoning: classification.reasoning,
        confidence: classification.confidence || 0.8,
      };
    } catch (error) {
      this.logger.error(
        `Error classifying report: ${error.message}`,
        error.stack,
      );

      // Fallback to default classification
      return {
        category: 'KHAC',
        priority: 'MEDIUM',
        suggestedStaffSkills: [],
        estimatedDuration: 60,
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
    } catch (error) {
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

CHỈ TRẢ VỀ JSON, KHÔNG THÊM TEXT KHÁC.
    `.trim();
  }
}
