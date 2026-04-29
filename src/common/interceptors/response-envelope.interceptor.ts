import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type SuccessEnvelope<T> = { success: true; data: T };

/**
 * Wraps successful JSON responses in `{ success: true, data }`.
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessEnvelope<unknown>> {
    return next.handle().pipe(
      map((data: unknown) => ({
        success: true as const,
        data,
      })),
    );
  }
}
