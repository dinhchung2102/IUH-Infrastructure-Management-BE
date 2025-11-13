import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = request;
    const userId = request.user?.sub || request.user?.userId;

    const startTime = Date.now();

    // Log request
    this.logger.logRequest(method, url, userId, {
      body: this.sanitizeBody(body),
      query,
      params,
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();

          this.logger.logResponse(
            method,
            url,
            response.statusCode,
            duration,
            {
              userId,
            },
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;

          this.logger.error(
            `${method} ${url} failed after ${duration}ms`,
            error.stack,
            'HttpError',
            {
              userId,
              statusCode: error.status || 500,
              message: error.message,
            },
          );
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return undefined;

    // Remove sensitive fields
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'refreshToken', 'otp', 'token'];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }
}

