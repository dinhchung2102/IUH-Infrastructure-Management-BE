import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { Report, ReportSchema } from './schema/report.schema';
import { AuditLog, AuditLogSchema } from '../audit/schema/auditlog.schema';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../../shared/upload/upload.module';
import { RedisModule } from '../../shared/redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    AuthModule,
    UploadModule,
    RedisModule,
  ],
  providers: [ReportService],
  controllers: [ReportController],
})
export class ReportModule {}
