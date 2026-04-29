import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * HTTP exception with a stable `code` for the response envelope (used by the global filter).
 */
export class ApiException extends HttpException {
  constructor(
    public readonly errorCode: string,
    message: string,
    status: HttpStatus,
  ) {
    super({ code: errorCode, message }, status);
  }
}
