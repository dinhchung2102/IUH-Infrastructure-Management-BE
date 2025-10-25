import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './features/auth/auth.module';
import { AuditModule } from './features/audit/audit.module';
import { AssetsModule } from './features/assets/assets.module';
import { CampusModule } from './features/campus/campus.module';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthModule } from './features/health/health.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthGuard } from './features/auth/guards/auth.guard';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ReportModule } from './features/report/report.module';
import { ZoneAreaModule } from './features/zone-area/zone-area.module';
import { UploadModule } from './shared/upload/upload.module';
import { QrCodeModule } from './shared/qrcode/qrcode.module';
import { NewsModule } from './features/news/news.module';

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
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: 'smtp.gmail.com',
          port: parseInt(config.get<string>('EMAIL_PORT') || '587'),
          secure: false,
          auth: {
            user: config.get<string>('EMAIL_USER'),
            pass: config.get<string>('EMAIL_PASSWORD'),
          },
        },
        defaults: {
          from: `"No Reply" <${config.get<string>('EMAIL_USER')}>`,
        },
        preview: false,
        template: {
          dir:
            process.env.NODE_ENV === 'production'
              ? process.cwd() + '/shared/email/templates/'
              : process.cwd() + '/src/shared/email/templates/',
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),

    AuthModule,
    AuditModule,
    AssetsModule,
    CampusModule,
    HealthModule,
    ReportModule,
    ZoneAreaModule,
    UploadModule,
    QrCodeModule,
    NewsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
