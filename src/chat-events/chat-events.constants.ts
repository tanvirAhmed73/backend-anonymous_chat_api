/** Single fan-out channel for all instances (Socket.IO gateway subscribes in step 6). */
export const CHAT_REDIS_EVENTS_CHANNEL = 'chat:events';

export type MessageNewPubPayload = {
  id: string;
  username: string;
  content: string;
  createdAt: string;
};

export type ChatRedisEnvelope =
  | {
      event: 'message:new';
      roomId: string;
      payload: MessageNewPubPayload;
    }
  | {
      event: 'room:deleted';
      roomId: string;
      payload: { roomId: string };
    };
