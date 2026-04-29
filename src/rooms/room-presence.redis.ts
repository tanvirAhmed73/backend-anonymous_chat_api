/**
 * Redis SET of usernames currently connected to a room (Socket layer uses the same key).
 * Cardinality = `activeUsers` for REST.
 */
export function roomPresenceRedisKey(roomId: string): string {
  return `chat:room:${roomId}:presence`;
}
