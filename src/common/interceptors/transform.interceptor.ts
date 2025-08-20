import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

interface ResponseData {
  message?: string;
  [key: string]: any;
}

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();

    return next.handle().pipe(
      map((data: ResponseData) => {
        const message = data?.message || 'Thành công';
        const responseData = { ...data };
        delete responseData.message;

        return {
          success: true,
          statusCode: ctx.getResponse<Response>().status,
          message,
          data: Object.keys(responseData).length > 0 ? responseData : null,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
