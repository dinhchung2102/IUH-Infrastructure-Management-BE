import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { join } from 'path';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor() {
    this.logger = this.createLogger();
  }

  /**
   * Set context for logging
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Create a new logger instance with specific context
   */
  static forContext(context: string): LoggerService {
    const logger = new LoggerService();
    logger.setContext(context);
    return logger;
  }

  private createLogger(): winston.Logger {
    const isProduction = process.env.NODE_ENV === 'production';
    const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');
    const logDir = process.env.LOG_DIR || 'logs';

    // Custom format
    const customFormat = winston.format.printf(
      ({ timestamp, level, message, context, trace, ...meta }) => {
        const ctx = context || this.context || 'Application';
        let log = `${timestamp} [${level.toUpperCase()}] [${ctx}] ${message}`;

        // Add metadata if exists
        if (Object.keys(meta).length > 0) {
          log += ` ${JSON.stringify(meta)}`;
        }

        // Add stack trace for errors
        if (trace) {
          log += `\n${trace}`;
        }

        return log;
      },
    );

    const transports: winston.transport[] = [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          customFormat,
        ),
      }),
    ];

    // File transports for production
    if (isProduction) {
      // All logs
      transports.push(
        new DailyRotateFile({
          dirname: join(logDir, 'combined'),
          filename: 'combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );

      // Error logs
      transports.push(
        new DailyRotateFile({
          level: 'error',
          dirname: join(logDir, 'errors'),
          filename: 'error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );

      // WebSocket logs
      transports.push(
        new DailyRotateFile({
          dirname: join(logDir, 'websocket'),
          filename: 'websocket-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '10m',
          maxFiles: '7d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );
    }

    return winston.createLogger({
      level: logLevel,
      transports,
      exceptionHandlers: isProduction
        ? [
            new DailyRotateFile({
              dirname: join(logDir, 'exceptions'),
              filename: 'exceptions-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              maxSize: '20m',
              maxFiles: '30d',
            }),
          ]
        : [],
      rejectionHandlers: isProduction
        ? [
            new DailyRotateFile({
              dirname: join(logDir, 'rejections'),
              filename: 'rejections-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              maxSize: '20m',
              maxFiles: '30d',
            }),
          ]
        : [],
    });
  }

  log(message: string, context?: string, meta?: Record<string, any>): void {
    this.logger.info(message, { context: context || this.context, ...meta });
  }

  error(
    message: string,
    trace?: string,
    context?: string,
    meta?: Record<string, any>,
  ): void {
    this.logger.error(message, {
      context: context || this.context,
      trace,
      ...meta,
    });
  }

  warn(message: string, context?: string, meta?: Record<string, any>): void {
    this.logger.warn(message, { context: context || this.context, ...meta });
  }

  debug(message: string, context?: string, meta?: Record<string, any>): void {
    this.logger.debug(message, { context: context || this.context, ...meta });
  }

  verbose(message: string, context?: string, meta?: Record<string, any>): void {
    this.logger.verbose(message, { context: context || this.context, ...meta });
  }

  // Custom methods for structured logging
  logRequest(method: string, url: string, userId?: string, meta?: any): void {
    this.log(`${method} ${url}`, 'HttpRequest', {
      method,
      url,
      userId,
      ...meta,
    });
  }

  logResponse(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    meta?: any,
  ): void {
    this.log(`${method} ${url} ${statusCode} ${duration}ms`, 'HttpResponse', {
      method,
      url,
      statusCode,
      duration,
      ...meta,
    });
  }

  logWebSocket(event: string, userId?: string, meta?: any): void {
    this.log(`WebSocket: ${event}`, 'WebSocket', {
      event,
      userId,
      ...meta,
    });
  }

  logDatabaseQuery(operation: string, collection: string, meta?: any): void {
    this.debug(`DB: ${operation} on ${collection}`, 'Database', {
      operation,
      collection,
      ...meta,
    });
  }
}
