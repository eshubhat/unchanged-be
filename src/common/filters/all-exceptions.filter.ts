import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, any>;
        message = res.message ?? exception.message;
        error = res.error ?? exception.name;
      }
    } else if (exception instanceof QueryFailedError) {
      // Handle PostgreSQL unique violations
      const pgError = exception as any;

      if (pgError.code === '23505') {
        status = HttpStatus.CONFLICT;
        message = 'A record with this value already exists';
        error = 'Conflict';
      } else if (pgError.code === '23503') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Related record not found';
        error = 'Bad Request';
      } else {
        this.logger.error('Database error', pgError);
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    this.logger.warn(
      `${request.method} ${request.url} → ${status}: ${JSON.stringify(message)}`,
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
