import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditLog, AuditLogSchema } from './schema/auditlog.schema';
import { Report, ReportSchema } from '../report/schema/report.schema';
import { Account, AccountSchema } from '../auth/schema/account.schema';
import { Role, RoleSchema } from '../auth/schema/role.schema';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../../shared/upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: Report.name, schema: ReportSchema },
      { name: Account.name, schema: AccountSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
    AuthModule,
    UploadModule,
  ],
  controllers: [AuditController],
  providers: [AuditService],
})
export class AuditModule {}
