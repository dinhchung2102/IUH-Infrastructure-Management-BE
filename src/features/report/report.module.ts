import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { Report, ReportSchema } from './schema/report.schema';
import { AuditLog, AuditLogSchema } from '../audit/schema/auditlog.schema';
import { Account, AccountSchema } from '../auth/schema/account.schema';
import { Role, RoleSchema } from '../auth/schema/role.schema';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../../shared/upload/upload.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: Account.name, schema: AccountSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
    AuthModule,
    UploadModule,
    RedisModule,
    forwardRef(() => AIModule), // Import AIModule để dùng SyncService
  ],
  providers: [ReportService],
  controllers: [ReportController],
  exports: [ReportService], // Export để AIModule có thể dùng nếu cần
})
export class ReportModule {}
