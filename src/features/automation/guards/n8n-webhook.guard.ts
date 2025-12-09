import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard to protect N8N webhook endpoints with secret key
 */
@Injectable()
export class N8NWebhookGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest() as {
      headers?: Record<string, string | string[] | undefined>;
      body?: { secret?: string; [key: string]: unknown };
    };
    const expectedSecret = this.configService.get<string>('N8N_WEBHOOK_SECRET');

    // If no secret is configured, allow access (for development)
    if (!expectedSecret) {
      return true;
    }

    // Check secret from header or body
    const headerSecret1 = request.headers?.['x-n8n-webhook-secret'];
    const headerSecret2 = request.headers?.['n8n-webhook-secret'];
    const headerSecret =
      typeof headerSecret1 === 'string'
        ? headerSecret1
        : typeof headerSecret2 === 'string'
          ? headerSecret2
          : undefined;
    const providedSecret = headerSecret || request.body?.secret;

    if (!providedSecret || providedSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid or missing N8N webhook secret');
    }

    return true;
  }
}
