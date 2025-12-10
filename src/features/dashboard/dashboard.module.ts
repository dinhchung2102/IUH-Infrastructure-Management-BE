import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Asset, AssetSchema } from '../assets/schema/asset.schema';
import { Account, AccountSchema } from '../auth/schema/account.schema';
import { Report, ReportSchema } from '../report/schema/report.schema';
import { AuditLog, AuditLogSchema } from '../audit/schema/auditlog.schema';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../../shared/redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Asset.name, schema: AssetSchema },
      { name: Account.name, schema: AccountSchema },
      { name: Report.name, schema: ReportSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    AuthModule,
    RedisModule,
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}
