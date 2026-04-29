import { HttpStatus, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DatabaseError } from 'pg';
import type { SessionUser } from '../auth/types/session-user';
import { ApiException } from '../common/exceptions/api.exception';
import { ErrorCodes } from '../common/constants/error-codes';
import { generateRoomId } from '../common/utils/ids';
import { DatabaseService } from '../db/database.service';
import { rooms, users } from '../db/schema';
import { ChatEventsPublisher } from '../chat-events/chat-events.publisher';
import { RoomPresenceService } from './room-presence.service';

export type RoomListItem = {
  id: string;
  name: string;
  createdBy: string;
  activeUsers: number;
  createdAt: string;
};

export type RoomCreated = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
};

@Injectable()
export class RoomsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly presence: RoomPresenceService,
    private readonly chatEvents: ChatEventsPublisher,
  ) {}

  async listRooms(): Promise<{ rooms: RoomListItem[] }> {
    const rows = await this.db.db
      .select({
        id: rooms.id,
        name: rooms.name,
        createdAt: rooms.createdAt,
        createdBy: users.username,
      })
      .from(rooms)
      .innerJoin(users, eq(rooms.createdByUserId, users.id))
      .orderBy(asc(rooms.createdAt));

    const ids = rows.map((r) => r.id);
    const counts = await this.presence.getActiveUserCounts(ids);

    return {
      rooms: rows.map((r) => ({
        id: r.id,
        name: r.name,
        createdBy: r.createdBy,
        activeUsers: counts.get(r.id) ?? 0,
        createdAt: this.toIso(r.createdAt),
      })),
    };
  }

  async getRoom(roomId: string): Promise<RoomListItem> {
    const [row] = await this.db.db
      .select({
        id: rooms.id,
        name: rooms.name,
        createdAt: rooms.createdAt,
        createdBy: users.username,
      })
      .from(rooms)
      .innerJoin(users, eq(rooms.createdByUserId, users.id))
      .where(eq(rooms.id, roomId))
      .limit(1);

    if (!row) {
      throw new ApiException(
        ErrorCodes.ROOM_NOT_FOUND,
        `Room with id ${roomId} does not exist`,
        HttpStatus.NOT_FOUND,
      );
    }

    const activeUsers = await this.presence.getActiveUserCount(row.id);

    return {
      id: row.id,
      name: row.name,
      createdBy: row.createdBy,
      activeUsers,
      createdAt: this.toIso(row.createdAt),
    };
  }

  async deleteRoom(
    roomId: string,
    session: SessionUser,
  ): Promise<{ deleted: true }> {
    const [room] = await this.db.db
      .select({
        id: rooms.id,
        createdByUserId: rooms.createdByUserId,
      })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1);

    if (!room) {
      throw new ApiException(
        ErrorCodes.ROOM_NOT_FOUND,
        `Room with id ${roomId} does not exist`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (room.createdByUserId !== session.id) {
      throw new ApiException(
        ErrorCodes.FORBIDDEN,
        'Only the room creator can delete this room',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.chatEvents.publishRoomDeleted(roomId);

    await this.db.db.delete(rooms).where(eq(rooms.id, roomId));

    await this.presence.clearPresence(roomId);

    return { deleted: true };
  }

  async createRoom(name: string, session: SessionUser): Promise<RoomCreated> {
    const id = generateRoomId();

    try {
      const [inserted] = await this.db.db
        .insert(rooms)
        .values({
          id,
          name,
          createdByUserId: session.id,
        })
        .returning({
          id: rooms.id,
          name: rooms.name,
          createdAt: rooms.createdAt,
        });

      if (!inserted) {
        throw new Error('Room insert returned no row');
      }

      return {
        id: inserted.id,
        name: inserted.name,
        createdBy: session.username,
        createdAt: this.toIso(inserted.createdAt),
      };
    } catch (err: unknown) {
      if (err instanceof DatabaseError && err.code === '23505') {
        throw new ApiException(
          ErrorCodes.ROOM_NAME_TAKEN,
          'A room with this name already exists',
          HttpStatus.CONFLICT,
        );
      }
      throw err;
    }
  }

  private toIso(value: Date): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
