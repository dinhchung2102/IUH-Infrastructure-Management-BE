import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { Report, ReportSchema } from '../report/schema/report.schema';
import { Asset, AssetSchema } from '../assets/schema/asset.schema';
import { AuditLog, AuditLogSchema } from '../audit/schema/auditlog.schema';
import { Campus, CampusSchema } from '../campus/schema/campus.schema';
import { Building, BuildingSchema } from '../zone-area/schema/building.schema';
import { Area, AreaSchema } from '../zone-area/schema/area.schema';
import { Zone, ZoneSchema } from '../zone-area/schema/zone.schema';
import { Account, AccountSchema } from '../auth/schema/account.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: Asset.name, schema: AssetSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: Campus.name, schema: CampusSchema },
      { name: Building.name, schema: BuildingSchema },
      { name: Area.name, schema: AreaSchema },
      { name: Zone.name, schema: ZoneSchema },
      { name: Account.name, schema: AccountSchema },
    ]),
    AuthModule,
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}

