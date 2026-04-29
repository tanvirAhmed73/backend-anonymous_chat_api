import { Injectable } from '@nestjs/common';
import {
  roomPresenceRedisKey,
  socketConnectionKey,
} from '../redis/chat-room.keys';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RoomPresenceService {
  constructor(private readonly redis: RedisService) {}

  /**
   * After the room row is removed: delete presence set, per-user socket sets,
   * and `chat:socket:*` entries so Redis matches “room gone” (spec fan-out already happened).
   */
  async purgeRoomArtifacts(roomId: string): Promise<void> {
    const redis = this.redis.client;
    const pattern = `chat:room:${roomId}:socks:*`;
    let cursor = '0';

    do {
      const [next, keys] = await redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        64,
      );
      cursor = next;

      for (const socksKey of keys) {
        const socketIds = await redis.smembers(socksKey);
        if (socketIds.length > 0) {
          await redis.del(...socketIds.map((id) => socketConnectionKey(id)));
        }
        await redis.del(socksKey);
      }
    } while (cursor !== '0');

    await redis.del(roomPresenceRedisKey(roomId));
  }

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
