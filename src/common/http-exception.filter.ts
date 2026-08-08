import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const reportedStatus =
      typeof exception === 'object' &&
      exception !== null &&
      'status' in exception &&
      typeof exception.status === 'number'
        ? exception.status
        : undefined;
    const status: number =
      exception instanceof HttpException
        ? exception.getStatus()
        : reportedStatus === 400 || reportedStatus === 413
          ? reportedStatus
          : 500;
    const details =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const detailObject =
      typeof details === 'object' && details !== null ? details : undefined;
    const message =
      typeof details === 'string'
        ? details
        : Array.isArray((details as { message?: unknown })?.message)
          ? ((details as { message: string[] }).message[0] ?? 'Request failed')
          : typeof (details as { message?: unknown })?.message === 'string'
            ? (details as { message: string }).message
            : status === 413
              ? 'Request body is too large'
              : status === 400
                ? 'Invalid JSON body'
                : status === 500
                  ? 'Internal server error'
                  : 'Request failed';
    const code =
      typeof (detailObject as { code?: unknown })?.code === 'string'
        ? (detailObject as { code: string }).code
        : (HttpStatus[status] ?? 'ERROR');
    const errors = Array.isArray((detailObject as { errors?: unknown })?.errors)
      ? (detailObject as { errors: unknown[] }).errors
      : undefined;

    response.status(status).json({
      statusCode: status,
      code,
      message,
      ...(errors ? { errors } : {}),
      path: request.url,
    });
  }
}
