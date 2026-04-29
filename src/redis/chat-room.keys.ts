import { roomPresenceRedisKey } from '../rooms/room-presence.redis';

export { roomPresenceRedisKey };

export function roomUserSocketsKey(roomId: string, username: string): string {
  return `chat:room:${roomId}:socks:${username}`;
}

export function socketConnectionKey(socketId: string): string {
  return `chat:socket:${socketId}`;
}
