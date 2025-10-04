import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditLog, AuditLogSchema } from './schema/auditlog.schema';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../../shared/upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    AuthModule,
    UploadModule,
  ],
  controllers: [AuditController],
  providers: [AuditService],
})
export class AuditModule {}
