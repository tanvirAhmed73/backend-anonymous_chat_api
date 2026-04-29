import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ErrorCodes } from '../../common/constants/error-codes';
import { IS_PUBLIC_KEY } from '../constants';
import { SessionService } from '../session.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(req);
    if (!token) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Missing or expired session token',
      });
    }

    const session = await this.sessions.getByToken(token);
    if (!session) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Missing or expired session token',
      });
    }

    req.sessionUser = session;
    return true;
  }
}

function extractBearerToken(req: Request): string | null {
  const raw = req.headers.authorization;
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  const prefix = 'Bearer ';
  if (!trimmed.startsWith(prefix)) {
    return null;
  }
  const token = trimmed.slice(prefix.length).trim();
  return token.length > 0 ? token : null;
}
