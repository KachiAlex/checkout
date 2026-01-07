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

    const numericStatus =
      typeof (exception as any)?.status === 'number'
        ? (exception as any).status
        : typeof (exception as any)?.statusCode === 'number'
          ? (exception as any).statusCode
          : undefined;

    const status =
      isHttpExceptionLike
        ? (maybeHttpException as HttpException).getStatus()
        : typeof numericStatus === 'number'
          ? numericStatus
          : isPassportUnauthorizedError
            ? HttpStatus.UNAUTHORIZED
            : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = isHttpExceptionLike
      ? (maybeHttpException as HttpException).getResponse()
      : { message: (exception as any)?.message || 'Internal server error' };

    const message =
      typeof responseBody === 'string'
        ? responseBody
        : (responseBody as any)?.message || (exception as any)?.message || 'Internal server error';

    if (status >= 500) {
      // Keep response generic for clients, but log details for diagnostics.
      // eslint-disable-next-line no-console
      console.error('[UnhandledException]', {
        name: (exception as any)?.name,
        message: (exception as any)?.message,
        status: numericStatus,
        path: (request as any)?.url,
      });
    }

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
