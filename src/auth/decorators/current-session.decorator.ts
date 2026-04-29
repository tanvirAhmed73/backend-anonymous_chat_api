import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SessionUser } from '../types/session-user';

export const CurrentSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser => {
    const req = ctx.switchToHttp().getRequest<{ sessionUser?: SessionUser }>();
    const user = req.sessionUser;
    if (!user) {
      throw new Error('CurrentSession used without authenticated request');
    }
    return user;
  },
);
