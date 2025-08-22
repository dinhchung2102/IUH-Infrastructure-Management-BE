import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './features/auth/auth.module';
import { AuditModule } from './features/audit/audit.module';
import { AssetsModule } from './features/assets/assets.module';
import { CampusService } from './features/campus/campus.service';
import { CampusController } from './features/campus/campus.controller';
import { CampusModule } from './features/campus/campus.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthGuard } from './features/auth/guards/auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
    }),
    AuthModule,
    AuditModule,
    AssetsModule,
    CampusModule,
  ],
  controllers: [AppController, CampusController],
  providers: [
    AppService,
    CampusService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
