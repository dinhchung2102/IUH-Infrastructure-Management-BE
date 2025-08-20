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

interface SuccessResponseConfig {
  defaultMessage: string;
  includeTimestamp: boolean;
  includePath: boolean;
}

interface SuccessResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: any;
  timestamp?: string;
  path?: string;
}

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  private readonly config: SuccessResponseConfig = {
    defaultMessage: 'Thành công',
    includeTimestamp: true,
    includePath: true,
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((data: ResponseData) => {
        const { message, responseData } = this.extractMessageAndData(data);

        return this.buildSuccessResponse(
          response.status,
          message,
          responseData,
          request.url,
        );
      }),
    );
  }

  private extractMessageAndData(data: ResponseData): {
    message: string;
    responseData: Record<string, any>;
  } {
    const message = data?.message || this.config.defaultMessage;
    const responseData = { ...data };
    delete responseData.message;

    return { message, responseData };
  }

  private buildSuccessResponse(
    status: number,
    message: string,
    data: Record<string, any>,
    path: string,
  ): SuccessResponse {
    const response: SuccessResponse = {
      success: true,
      statusCode: status,
      message,
      data: this.hasData(data) ? data : null,
    };

    if (this.config.includeTimestamp) {
      response.timestamp = new Date().toISOString();
    }

    if (this.config.includePath) {
      response.path = path;
    }

    return response;
  }

  private hasData(data: Record<string, any>): boolean {
    return data && typeof data === 'object' && Object.keys(data).length > 0;
  }
}
