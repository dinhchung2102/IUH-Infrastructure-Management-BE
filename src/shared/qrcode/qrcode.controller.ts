import { Controller, Get, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../features/auth/decorators/public.decorator';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QRCode = require('qrcode');

@Controller('qr')
export class QrController {
  constructor(private readonly configService: ConfigService) {}

  @Public()
  @Get(':reportId')
  async generateQr(@Param('reportId') reportId: string): Promise<{
    qr: string;
    url: string;
  }> {
    const url = `${this.configService.get<string>('REDIRECT_DOMAIN')}/${reportId}`;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const qrDataUrl = (await QRCode.toDataURL(url)) as string;
    return { qr: qrDataUrl, url };
  }
}
