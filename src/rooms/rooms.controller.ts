import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentSession } from '../auth/decorators/current-session.decorator';
import type { SessionUser } from '../auth/types/session-user';
import { CreateRoomDto } from '../common/dto/create-room.dto';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get()
  list() {
    return this.rooms.listRooms();
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(@Body() body: CreateRoomDto, @CurrentSession() user: SessionUser) {
    return this.rooms.createRoom(body.name, user);
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentSession() user: SessionUser) {
    return this.rooms.deleteRoom(id, user);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.rooms.getRoom(id);
  }
}
