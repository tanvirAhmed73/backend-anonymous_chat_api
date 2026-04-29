import {
  BadRequestException,
  HttpException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ErrorCodes } from '../constants/error-codes';

function collectMessages(errors: ValidationError[]): string[] {
  const out: string[] = [];
  for (const e of errors) {
    if (e.constraints) {
      out.push(...Object.values(e.constraints));
    }
    if (e.children?.length) {
      out.push(...collectMessages(e.children));
    }
  }
  return out;
}

/**
 * Maps `content` field failures to 422 + contract codes; other fields use 400 + VALIDATION_ERROR.
 */
export function createValidationExceptionFactory() {
  return (errors: ValidationError[]): HttpException => {
    const first = errors[0];
    if (first?.property === 'content' && first.constraints) {
      const keys = Object.keys(first.constraints);
      const message = Object.values(first.constraints)[0];
      if (keys.includes('maxLength')) {
        return new UnprocessableEntityException({
          code: ErrorCodes.MESSAGE_TOO_LONG,
          message,
        });
      }
      return new UnprocessableEntityException({
        code: ErrorCodes.MESSAGE_EMPTY,
        message,
      });
    }

    const messages = collectMessages(errors);
    return new BadRequestException({
      message: messages.length > 0 ? messages : ['Validation failed'],
    });
  };
}
