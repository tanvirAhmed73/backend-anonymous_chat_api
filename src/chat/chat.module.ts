import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatGateway } from './chat.gateway';
import { SocketPresenceService } from './socket-presence.service';

@Module({
  imports: [AuthModule],
  providers: [ChatGateway, SocketPresenceService],
})
export class ChatModule {}
