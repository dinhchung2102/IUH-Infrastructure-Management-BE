import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class ChatDto {
  @IsString()
  @MinLength(3, { message: 'Câu hỏi phải có ít nhất 3 ký tự' })
  @MaxLength(500, { message: 'Câu hỏi không được vượt quá 500 ký tự' })
  query: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString({ each: true })
  sourceTypes?: string[];
}
