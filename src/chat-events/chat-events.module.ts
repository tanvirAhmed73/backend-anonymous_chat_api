import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { ChatEventsPublisher } from './chat-events.publisher';

@Module({
  imports: [RedisModule],
  providers: [ChatEventsPublisher],
  exports: [ChatEventsPublisher],
})
export class ChatEventsModule {}
