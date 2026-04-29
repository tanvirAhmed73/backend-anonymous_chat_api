import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { roomPresenceRedisKey } from '../rooms/room-presence.redis';

/** Per-user socket refs within a room (same username may have multiple tabs). */
export function roomUserSocketsKey(roomId: string, username: string): string {
  return `chat:room:${roomId}:socks:${username}`;
}

/** Redis-backed mapping from Socket.IO id → session (no in-memory maps). */
export function socketConnectionKey(socketId: string): string {
  return `chat:socket:${socketId}`;
}

export type SocketRoomMeta = { roomId: string; username: string };

@Injectable()
export class SocketPresenceService {
  constructor(private readonly redis: RedisService) {}

  /** Registers socket in Redis and returns sorted active usernames for the room. */
  async joinRoom(
    roomId: string,
    username: string,
    socketId: string,
  ): Promise<string[]> {
    const socksKey = roomUserSocketsKey(roomId, username);
    const presenceKey = roomPresenceRedisKey(roomId);

    const beforeCount = await this.redis.client.scard(socksKey);
    await this.redis.client.sadd(socksKey, socketId);

    if (beforeCount === 0) {
      await this.redis.client.sadd(presenceKey, username);
    }

    const meta: SocketRoomMeta = { roomId, username };
    await this.redis.client.set(
      socketConnectionKey(socketId),
      JSON.stringify(meta),
    );

    return this.getActiveUsernames(roomId);
  }

  /**
   * Removes socket state; returns metadata if this socket was registered (for fan-out).
   */
  async leaveSocket(socketId: string): Promise<SocketRoomMeta | null> {
    const raw = await this.redis.client.get(socketConnectionKey(socketId));
    if (!raw) {
      return null;
    }

    await this.redis.client.del(socketConnectionKey(socketId));

    let meta: SocketRoomMeta;
    try {
      meta = JSON.parse(raw) as SocketRoomMeta;
    } catch {
      return null;
    }

    const socksKey = roomUserSocketsKey(meta.roomId, meta.username);
    await this.redis.client.srem(socksKey, socketId);
    const left = await this.redis.client.scard(socksKey);
    if (left === 0) {
      await this.redis.client.del(socksKey);
      await this.redis.client.srem(
        roomPresenceRedisKey(meta.roomId),
        meta.username,
      );
    }

    return meta;
  }

  async getActiveUsernames(roomId: string): Promise<string[]> {
    const members = await this.redis.client.smembers(
      roomPresenceRedisKey(roomId),
    );
    return members.sort((a, b) => a.localeCompare(b));
  }
}
