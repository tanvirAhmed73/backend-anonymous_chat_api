import { Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import { eq } from 'drizzle-orm';
import Redis from 'ioredis';
import type { Namespace, Socket } from 'socket.io';
import { SessionService } from '../auth/session.service';
import {
  CHAT_REDIS_EVENTS_CHANNEL,
  type ChatRedisEnvelope,
} from '../chat-events/chat-events.constants';
import { DatabaseService } from '../db/database.service';
import { rooms } from '../db/schema';
import { SocketPresenceService } from './socket-presence.service';

function singleQueryParam(
  v: string | string[] | undefined,
): string | undefined {
  if (v === undefined) {
    return undefined;
  }
  return Array.isArray(v) ? v[0] : v;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: true },
})
export class ChatGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy
{
  private readonly logger = new Logger(ChatGateway.name);

  /** Namespace `/chat` (use `.server` for the root io instance, e.g. Redis adapter). */
  @WebSocketServer()
  server!: Namespace;

  private adapterPub?: Redis;
  private adapterSub?: Redis;
  private eventsSub?: Redis;

  constructor(
    private readonly config: ConfigService,
    private readonly sessions: SessionService,
    private readonly db: DatabaseService,
    private readonly presence: SocketPresenceService,
  ) {}

  async afterInit(): Promise<void> {
    const url = this.config.getOrThrow<string>('REDIS_URL');
    /** Own Redis connections so shutdown order does not close duplicates before quit. */
    this.adapterPub = new Redis(url, { maxRetriesPerRequest: null });
    this.adapterSub = this.adapterPub.duplicate();
    const root = this.server.server;
    root.adapter(createAdapter(this.adapterPub, this.adapterSub));

    this.eventsSub = this.adapterPub.duplicate();
    try {
      await this.eventsSub.subscribe(CHAT_REDIS_EVENTS_CHANNEL);
      this.eventsSub.on('message', (_channel: string, rawMessage: string) => {
        this.dispatchRedisEnvelope(rawMessage);
      });
    } catch (err: unknown) {
      this.logger.warn(`Redis subscribe failed: ${String(err)}`);
    }
  }

  private dispatchRedisEnvelope(rawMessage: string): void {
    let envelope: ChatRedisEnvelope;
    try {
      envelope = JSON.parse(rawMessage) as ChatRedisEnvelope;
    } catch {
      return;
    }

    if (!this.server) {
      return;
    }

    if (envelope.event === 'message:new') {
      this.server.to(envelope.roomId).emit('message:new', envelope.payload);
      return;
    }

    if (envelope.event === 'room:deleted') {
      this.server.to(envelope.roomId).emit('room:deleted', envelope.payload);
      void this.server.in(envelope.roomId).disconnectSockets(true);
    }
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = singleQueryParam(client.handshake.query.token);
    const roomId = singleQueryParam(client.handshake.query.roomId);

    if (!token || !roomId) {
      client.disconnect(true);
      return;
    }

    const session = await this.sessions.getByToken(token);
    if (!session) {
      client.disconnect(true);
      return;
    }

    const exists = await this.roomExists(roomId);
    if (!exists) {
      client.disconnect(true);
      return;
    }

    await client.join(roomId);

    const activeUsers = await this.presence.joinRoom(
      roomId,
      session.username,
      client.id,
    );

    client.emit('room:joined', { activeUsers });

    client.broadcast.to(roomId).emit('room:user_joined', {
      username: session.username,
      activeUsers,
    });
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const meta = await this.presence.leaveSocket(client.id);
    if (!meta) {
      return;
    }

    const activeUsers = await this.presence.getActiveUsernames(meta.roomId);
    this.server.to(meta.roomId).emit('room:user_left', {
      username: meta.username,
      activeUsers,
    });
  }

  @SubscribeMessage('room:leave')
  async onRoomLeave(@ConnectedSocket() client: Socket): Promise<void> {
    const meta = await this.presence.leaveSocket(client.id);
    if (!meta) {
      return;
    }

    const activeUsers = await this.presence.getActiveUsernames(meta.roomId);
    this.server.to(meta.roomId).emit('room:user_left', {
      username: meta.username,
      activeUsers,
    });

    client.disconnect(true);
  }

  private async roomExists(roomId: string): Promise<boolean> {
    const [row] = await this.db.db
      .select({ id: rooms.id })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1);
    return !!row;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.eventsSub) {
      this.eventsSub.removeAllListeners('message');
      await this.eventsSub.unsubscribe(CHAT_REDIS_EVENTS_CHANNEL);
      await this.eventsSub.quit();
    }
    await this.adapterSub?.quit();
    await this.adapterPub?.quit();
  }
}
