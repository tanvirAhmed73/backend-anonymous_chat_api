import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import {
  CHAT_REDIS_EVENTS_CHANNEL,
  type ChatRedisEnvelope,
  type MessageNewPubPayload,
} from './chat-events.constants';

@Injectable()
export class ChatEventsPublisher {
  private readonly logger = new Logger(ChatEventsPublisher.name);

  constructor(private readonly redis: RedisService) {}

  async publishMessageNew(
    roomId: string,
    payload: MessageNewPubPayload,
  ): Promise<void> {
    const envelope: ChatRedisEnvelope = {
      event: 'message:new',
      roomId,
      payload,
    };
    await this.publish(envelope);
  }

  /** Call before deleting the room row (contract). */
  async publishRoomDeleted(roomId: string): Promise<void> {
    const envelope: ChatRedisEnvelope = {
      event: 'room:deleted',
      roomId,
      payload: { roomId },
    };
    await this.publish(envelope);
  }

  private async publish(envelope: ChatRedisEnvelope): Promise<void> {
    try {
      await this.redis.client.publish(
        CHAT_REDIS_EVENTS_CHANNEL,
        JSON.stringify(envelope),
      );
    } catch (err: unknown) {
      this.logger.warn(
        `Redis publish failed (${envelope.event}): ${String(err)}`,
      );
      throw err;
    }
  }
}
