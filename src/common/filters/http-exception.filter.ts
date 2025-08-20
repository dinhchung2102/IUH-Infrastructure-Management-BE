import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ThrottlerException } from '@nestjs/throttler';

interface ExceptionResponse {
  message: string | string[] | Record<string, any>;
  errorCode?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Lỗi máy chủ nội bộ';
    let errorCode = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      if (exception instanceof ThrottlerException) {
        message = 'Quá nhiều yêu cầu. Vui lòng thử lại sau';
        errorCode = 'TOO_MANY_REQUESTS';
      } else if (exception instanceof ForbiddenException) {
        message = `Bạn không đủ quyền để thực hiện hành động này`;
        errorCode = 'FORBIDDEN_RESOURCE';
      } else {
        const exceptionResponse = exception.getResponse();
        if (typeof exceptionResponse === 'string') {
          message = exceptionResponse;
        } else if (
          typeof exceptionResponse === 'object' &&
          exceptionResponse !== null &&
          'message' in exceptionResponse
        ) {
          const typedResponse = exceptionResponse as ExceptionResponse;
          message =
            typeof typedResponse.message === 'string'
              ? typedResponse.message
              : JSON.stringify(typedResponse.message);

          if (typedResponse.errorCode) {
            errorCode = typedResponse.errorCode;
          }
        }
      }
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errorCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
