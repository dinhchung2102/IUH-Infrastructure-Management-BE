import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ZoneAreaController } from './zone-area.controller';
import { ZoneAreaService } from './zone-area.service';
import { ZoneAreaMainService } from './zone-area-main.service';
import { Area, AreaSchema } from './schema/area.schema';
import { Building, BuildingSchema } from './schema/building.schema';
import { Zone, ZoneSchema } from './schema/zone.schema';
import { Campus, CampusSchema } from '../campus/schema/campus.schema';
import { AuthModule } from '../auth';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Area.name, schema: AreaSchema },
      { name: Building.name, schema: BuildingSchema },
      { name: Zone.name, schema: ZoneSchema },
      { name: Campus.name, schema: CampusSchema },
    ]),
    AuthModule,
  ],
  controllers: [ZoneAreaController],
  providers: [ZoneAreaService, ZoneAreaMainService],
  exports: [ZoneAreaService],
})
export class ZoneAreaModule {}
