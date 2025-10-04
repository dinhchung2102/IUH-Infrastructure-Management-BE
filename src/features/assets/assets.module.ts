import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { Asset, AssetSchema } from './schema/asset.schema';
import { AssetType, AssetTypeSchema } from './schema/asset_type.schema';
import {
  AssetCategory,
  AssetCategorySchema,
} from './schema/asset_category.schema';
import { AuthModule } from '../auth';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AssetCategory.name, schema: AssetCategorySchema },
      { name: AssetType.name, schema: AssetTypeSchema },
      { name: Asset.name, schema: AssetSchema },
    ]),
    AuthModule,
  ],
  providers: [AssetsService],
  controllers: [AssetsController],
})
export class AssetsModule {}
