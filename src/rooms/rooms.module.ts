import { Module } from '@nestjs/common';
import { ChatEventsModule } from '../chat-events/chat-events.module';
import { RoomPresenceService } from './room-presence.service';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  imports: [ChatEventsModule],
  controllers: [RoomsController],
  providers: [RoomsService, RoomPresenceService],
  exports: [RoomsService, RoomPresenceService],
})
export class RoomsModule {}
