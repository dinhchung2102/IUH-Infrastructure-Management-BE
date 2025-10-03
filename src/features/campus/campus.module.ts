import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Campus, CampusSchema } from './schema/campus.schema';
import { CampusController } from './campus.controller';
import { CampusService } from './campus.service';
import { AuthModule } from '../auth';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Campus.name, schema: CampusSchema }]),
    AuthModule,
  ],
  controllers: [CampusController],
  providers: [CampusService],
  exports: [CampusService],
})
export class CampusModule {}
