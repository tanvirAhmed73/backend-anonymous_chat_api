import { Module } from '@nestjs/common';
import { ChatEventsModule } from '../chat-events/chat-events.module';
import { MessagesService } from './messages.service';
import { RoomMessagesController } from './room-messages.controller';

@Module({
  imports: [ChatEventsModule],
  controllers: [RoomMessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
