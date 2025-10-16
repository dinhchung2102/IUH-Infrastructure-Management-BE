import { Module } from '@nestjs/common';
import { QrController } from './qrcode.controller';

@Module({
  controllers: [QrController],
})
export class QrCodeModule {}
