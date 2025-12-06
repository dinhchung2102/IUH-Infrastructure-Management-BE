import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NewsController } from './news.controller';
import { NewsCategoryController } from './news-category.controller';
import { NewsService } from './news.service';
import { News, NewsSchema } from './schema/news.schema';
import { NewsCategory, NewsCategorySchema } from './schema/newsCategory.schema';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../../shared/upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: News.name, schema: NewsSchema },
      { name: NewsCategory.name, schema: NewsCategorySchema },
    ]),
    AuthModule,
    UploadModule,
  ],
  controllers: [NewsController, NewsCategoryController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
