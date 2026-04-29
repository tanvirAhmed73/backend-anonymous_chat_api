import { HttpStatus, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { SessionUser } from '../auth/types/session-user';
import { ChatEventsPublisher } from '../chat-events/chat-events.publisher';
import { ApiException } from '../common/exceptions/api.exception';
import { ErrorCodes } from '../common/constants/error-codes';
import { generateMessageId } from '../common/utils/ids';
import { DatabaseService } from '../db/database.service';
import { messages, rooms } from '../db/schema';

export type MessageDto = {
  id: string;
  roomId: string;
  username: string;
  content: string;
  createdAt: string;
};

@Injectable()
export class MessagesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly chatEvents: ChatEventsPublisher,
  ) {}

  async listMessages(
    roomId: string,
    limit: number,
    before?: string,
  ): Promise<{
    messages: MessageDto[];
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    await this.requireRoom(roomId);

    const take = Math.min(100, Math.max(1, limit));
    const takePlus = take + 1;

    let rows: (typeof messages.$inferSelect)[];

    if (before) {
      const [cursor] = await this.db.db
        .select()
        .from(messages)
        .where(and(eq(messages.roomId, roomId), eq(messages.id, before)))
        .limit(1);

      if (!cursor) {
        throw new ApiException(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid message cursor',
          HttpStatus.BAD_REQUEST,
        );
      }

      rows = await this.db.db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.roomId, roomId),
            sql`(${messages.createdAt}, ${messages.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id})`,
          ),
        )
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(takePlus);
    } else {
      rows = await this.db.db
        .select()
        .from(messages)
        .where(eq(messages.roomId, roomId))
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(takePlus);
    }

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const nextCursor =
      hasMore && page.length > 0 ? page[page.length - 1].id : null;

    return {
      messages: page.map((m) => ({
        id: m.id,
        roomId: m.roomId,
        username: m.username,
        content: m.content,
        createdAt: this.toIso(m.createdAt),
      })),
      hasMore,
      nextCursor,
    };
  }

  async createMessage(
    roomId: string,
    content: string,
    session: SessionUser,
  ): Promise<MessageDto> {
    await this.requireRoom(roomId);

    const id = generateMessageId();
    const [inserted] = await this.db.db
      .insert(messages)
      .values({
        id,
        roomId,
        userId: session.id,
        username: session.username,
        content,
      })
      .returning();

    if (!inserted) {
      throw new Error('Message insert returned no row');
    }

    const dto: MessageDto = {
      id: inserted.id,
      roomId: inserted.roomId,
      username: inserted.username,
      content: inserted.content,
      createdAt: this.toIso(inserted.createdAt),
    };

    await this.chatEvents.publishMessageNew(roomId, {
      id: dto.id,
      username: dto.username,
      content: dto.content,
      createdAt: dto.createdAt,
    });

    return dto;
  }

  private async requireRoom(roomId: string): Promise<void> {
    const [r] = await this.db.db
      .select({ id: rooms.id })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1);

    if (!r) {
      throw new ApiException(
        ErrorCodes.ROOM_NOT_FOUND,
        `Room with id ${roomId} does not exist`,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private toIso(value: Date): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
