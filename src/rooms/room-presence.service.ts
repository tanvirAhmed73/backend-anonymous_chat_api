import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { roomPresenceRedisKey } from './room-presence.redis';

@Injectable()
export class RoomPresenceService {
  constructor(private readonly redis: RedisService) {}

  async getActiveUserCount(roomId: string): Promise<number> {
    return this.redis.client.scard(roomPresenceRedisKey(roomId));
  }

  /** One round-trip for many rooms (used by GET /rooms). */
  async getActiveUserCounts(roomIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (roomIds.length === 0) {
      return map;
    }

    const pipeline = this.redis.client.pipeline();
    for (const id of roomIds) {
      pipeline.scard(roomPresenceRedisKey(id));
    }
    const results = await pipeline.exec();

    roomIds.forEach((id, i) => {
      const tuple = results?.[i];
      const err = tuple?.[0];
      const value = tuple?.[1];
      if (err || typeof value !== 'number') {
        map.set(id, 0);
      } else {
        map.set(id, value);
      }
    });

    return map;
  }
}
