import type { SessionUser } from '../auth/types/session-user';

declare global {
  namespace Express {
    interface Request {
      sessionUser?: SessionUser;
    }
  }
}

export {};
