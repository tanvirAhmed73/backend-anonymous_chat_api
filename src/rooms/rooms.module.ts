import { Module } from '@nestjs/common';
import { RoomPresenceService } from './room-presence.service';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  controllers: [RoomsController],
  providers: [RoomsService, RoomPresenceService],
  exports: [RoomsService, RoomPresenceService],
})
export class RoomsModule {}
