import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse();

    const maybeHttpException = exception as any;
    const isHttpExceptionLike =
      maybeHttpException &&
      typeof maybeHttpException.getStatus === 'function' &&
      typeof maybeHttpException.getResponse === 'function';

    const isPassportUnauthorizedError =
      typeof (exception as any)?.name === 'string' &&
      (exception as any).name === 'UnauthorizedError';

    const status =
      isHttpExceptionLike
        ? (maybeHttpException as HttpException).getStatus()
        : isPassportUnauthorizedError
          ? HttpStatus.UNAUTHORIZED
          : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody =
      isHttpExceptionLike
        ? (maybeHttpException as HttpException).getResponse()
        : { message: 'Internal server error' };

    const message =
      typeof responseBody === 'string'
        ? responseBody
        : (responseBody as any)?.message || 'Internal server error';

    httpAdapter.reply(
      response,
      {
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
        path: (request as any)?.url,
      },
      status,
    );
  }
}
