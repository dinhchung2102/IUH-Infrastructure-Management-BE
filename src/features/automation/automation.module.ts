import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { N8NWebhookGuard } from './guards/n8n-webhook.guard';
import { ReportModule } from '../report/report.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { Report, ReportSchema } from '../report/schema/report.schema';
import { AuditLog, AuditLogSchema } from '../audit/schema/auditlog.schema';
import { Account, AccountSchema } from '../auth/schema/account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: Account.name, schema: AccountSchema },
    ]),
    ReportModule,
    AuditModule,
    AuthModule,
    StatisticsModule,
    DashboardModule,
  ],
  controllers: [AutomationController],
  providers: [AutomationService, N8NWebhookGuard],
  exports: [AutomationService],
})
export class AutomationModule {}
