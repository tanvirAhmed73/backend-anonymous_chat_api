import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentSession } from '../auth/decorators/current-session.decorator';
import type { SessionUser } from '../auth/types/session-user';
import { CreateMessageDto } from '../common/dto/create-message.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { MessagesService } from './messages.service';

@Controller('rooms')
export class RoomMessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get(':id/messages')
  list(@Param('id') roomId: string, @Query() query: ListMessagesQueryDto) {
    return this.messages.listMessages(roomId, query.limit, query.before);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post(':id/messages')
  create(
    @Param('id') roomId: string,
    @Body() body: CreateMessageDto,
    @CurrentSession() user: SessionUser,
  ) {
    return this.messages.createMessage(roomId, body.content, user);
  }
}
