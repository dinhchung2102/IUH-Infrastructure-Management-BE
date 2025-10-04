import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { Report, ReportSchema } from './schema/report.schema';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../../shared/upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Report.name, schema: ReportSchema }]),
    AuthModule,
    UploadModule,
  ],
  providers: [ReportService],
  controllers: [ReportController],
})
export class ReportModule {}
