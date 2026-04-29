import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import type { SessionUser } from './types/session-user';

const SESSION_KEY_PREFIX = 'chat:sess:';
/** 24 hours */
export const SESSION_TTL_SECONDS = 60 * 60 * 24;

@Injectable()
export class SessionService {
  constructor(private readonly redis: RedisService) {}

  private key(token: string): string {
    return `${SESSION_KEY_PREFIX}${token}`;
  }

  async save(token: string, user: SessionUser): Promise<void> {
    await this.redis.client.set(
      this.key(token),
      JSON.stringify(user),
      'EX',
      SESSION_TTL_SECONDS,
    );
  }

  async getByToken(token: string): Promise<SessionUser | null> {
    const raw = await this.redis.client.get(this.key(token));
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      return null;
    }
  }
}
