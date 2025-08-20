import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ERROR_CONFIGS, DEFAULT_ERROR } from '../config/response.config';

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

    const { status, message, errorCode } = this.extractErrorInfo(exception);

    const errorResponse = this.buildErrorResponse(
      status,
      message,
      errorCode,
      request.url,
    );

    response.status(status).json(errorResponse);
  }

  private extractErrorInfo(exception: unknown): {
    status: number;
    message: string;
    errorCode: string;
  } {
    if (!(exception instanceof HttpException)) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: DEFAULT_ERROR.message,
        errorCode: DEFAULT_ERROR.errorCode,
      };
    }

    const status = exception.getStatus();
    const exceptionName = exception.constructor.name;
    const config = ERROR_CONFIGS.get(exceptionName);

    if (config) {
      return { status, message: config.message, errorCode: config.errorCode };
    }

    return this.extractMessageFromException(exception, status);
  }

  private extractMessageFromException(
    exception: HttpException,
    status: number,
  ): { status: number; message: string; errorCode: string } {
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return {
        status,
        message: exceptionResponse,
        errorCode: this.getErrorCodeFromStatus(status),
      };
    }

    if (this.isExceptionResponse(exceptionResponse)) {
      const message =
        typeof exceptionResponse.message === 'string'
          ? exceptionResponse.message
          : JSON.stringify(exceptionResponse.message);

      return {
        status,
        message,
        errorCode:
          exceptionResponse.errorCode || this.getErrorCodeFromStatus(status),
      };
    }

    return {
      status,
      message: DEFAULT_ERROR.message,
      errorCode: this.getErrorCodeFromStatus(status),
    };
  }

  private isExceptionResponse(obj: any): obj is ExceptionResponse {
    return typeof obj === 'object' && obj !== null && 'message' in obj;
  }

  private getErrorCodeFromStatus(status: number): string {
    const statusErrorMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };

    return statusErrorMap[status] || 'UNKNOWN_ERROR';
  }

  private buildErrorResponse(
    status: number,
    message: string,
    errorCode: string,
    path: string,
  ) {
    return {
      success: false,
      statusCode: status,
      message,
      errorCode,
      timestamp: new Date().toISOString(),
      path,
    };
  }
}
