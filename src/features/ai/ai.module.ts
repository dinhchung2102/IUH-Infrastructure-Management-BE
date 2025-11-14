import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Services
import { GeminiService } from './services/gemini.service';
import { QdrantService } from './services/qdrant.service';
import { RAGService } from './services/rag.service';
import { ClassificationService } from './services/classification.service';
import { SyncService } from './services/sync.service';

// Controllers
import { AIChatController } from './controllers/ai-chat.controller';
import { AIClassificationController } from './controllers/ai-classification.controller';

// Processors
import { IndexingProcessor } from './processors/indexing.processor';

// Schemas
import {
  IndexedDocument,
  IndexedDocumentSchema,
} from './schemas/indexed-document.schema';

// Auth Module
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: IndexedDocument.name, schema: IndexedDocumentSchema },
    ]),
    BullModule.registerQueueAsync({
      name: 'ai-indexing',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: parseInt(configService.get<string>('REDIS_PORT') || '6379'),
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
  ],
  providers: [
    GeminiService,
    QdrantService,
    RAGService,
    ClassificationService,
    SyncService,
    IndexingProcessor,
  ],
  controllers: [AIChatController, AIClassificationController],
  exports: [
    GeminiService,
    QdrantService,
    RAGService,
    ClassificationService,
    SyncService,
  ],
})
export class AIModule {}
