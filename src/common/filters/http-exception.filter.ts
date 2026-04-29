import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorCodes } from '../constants/error-codes';

type ErrorBody = { success: false; error: { code: string; message: string } };

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const { status, code, message } = this.normalize(exception);

    const body: ErrorBody = {
      success: false,
      error: { code, message },
    };

    res.status(status).json(body);
  }

  private normalize(exception: unknown): {
    status: number;
    code: string;
    message: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();

      if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;

        if (typeof obj.code === 'string' && typeof obj.message === 'string') {
          return { status, code: obj.code, message: obj.message };
        }

        if (status === 400 && obj.message !== undefined) {
          const msg = this.validationMessage(obj.message);
          return {
            status,
            code: ErrorCodes.VALIDATION_ERROR,
            message: msg,
          };
        }

        if (typeof obj.message === 'string') {
          return {
            status,
            code: this.defaultCodeForStatus(status),
            message: obj.message,
          };
        }

        if (Array.isArray(obj.message)) {
          return {
            status,
            code: ErrorCodes.VALIDATION_ERROR,
            message: this.validationMessage(obj.message),
          };
        }
      }

      if (typeof raw === 'string') {
        return {
          status,
          code: this.defaultCodeForStatus(status),
          message: raw,
        };
      }
    }

    const error =
      exception instanceof Error ? exception : new Error('Unknown error');

    return {
      status: 500,
      code: ErrorCodes.INTERNAL_ERROR,
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : error.message,
    };
  }

  private validationMessage(message: unknown): string {
    if (Array.isArray(message) && message.length > 0) {
      const first: unknown = message[0];
      return typeof first === 'string' ? first : String(first);
    }
    if (typeof message === 'string') {
      return message;
    }
    return 'Validation failed';
  }

  private defaultCodeForStatus(status: number): string {
    switch (status) {
      case 401:
        return ErrorCodes.UNAUTHORIZED;
      case 403:
        return ErrorCodes.FORBIDDEN;
      case 404:
        return ErrorCodes.ROOM_NOT_FOUND;
      case 409:
        return ErrorCodes.ROOM_NAME_TAKEN;
      case 422:
        return ErrorCodes.MESSAGE_TOO_LONG;
      default:
        return ErrorCodes.INTERNAL_ERROR;
    }
  }
}
