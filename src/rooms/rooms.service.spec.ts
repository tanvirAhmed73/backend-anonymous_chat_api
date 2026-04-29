import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DatabaseError } from 'pg';
import { DatabaseService } from '../db/database.service';
import { ApiException } from '../common/exceptions/api.exception';
import { ErrorCodes } from '../common/constants/error-codes';
import { ChatEventsPublisher } from '../chat-events/chat-events.publisher';
import { RoomPresenceService } from './room-presence.service';
import { RoomsService } from './rooms.service';

describe('RoomsService', () => {
  const session = {
    id: 'usr_1',
    username: 'ali_123',
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  let service: RoomsService;
  let selectFrom: jest.Mock;
  let insertChain: { returning: jest.Mock };
  let getActiveUserCounts: jest.Mock;
  let getActiveUserCount: jest.Mock;
  let purgeRoomArtifacts: jest.Mock;
  let publishRoomDeleted: jest.Mock;

  beforeEach(async () => {
    getActiveUserCounts = jest.fn().mockResolvedValue(new Map());
    getActiveUserCount = jest.fn().mockResolvedValue(0);
    purgeRoomArtifacts = jest.fn().mockResolvedValue(undefined);
    publishRoomDeleted = jest.fn().mockResolvedValue(undefined);

    insertChain = {
      returning: jest.fn(),
    };

    selectFrom = jest.fn().mockReturnValue({
      innerJoin: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockResolvedValue([]),
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([]),
      }),
    });

    const db = {
      select: jest.fn().mockReturnValue({
        from: selectFrom,
      }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue(insertChain),
      }),
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: DatabaseService, useValue: { db } },
        {
          provide: RoomPresenceService,
          useValue: {
            getActiveUserCounts,
            getActiveUserCount,
            purgeRoomArtifacts,
          },
        },
        {
          provide: ChatEventsPublisher,
          useValue: {
            publishRoomDeleted,
          },
        },
      ],
    }).compile();

    service = moduleRef.get(RoomsService);
  });

  it('listRooms merges Redis active user counts', async () => {
    const row = {
      id: 'room_a',
      name: 'general',
      createdAt: new Date('2024-03-01T10:00:00.000Z'),
      createdBy: 'ali_123',
    };
    selectFrom.mockReturnValue({
      innerJoin: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockResolvedValue([row]),
      }),
    });
    getActiveUserCounts.mockResolvedValue(new Map([['room_a', 4]]));

    const result = await service.listRooms();

    expect(result.rooms).toHaveLength(1);
    expect(result.rooms[0]).toMatchObject({
      id: 'room_a',
      name: 'general',
      createdBy: 'ali_123',
      activeUsers: 4,
    });
    expect(getActiveUserCounts).toHaveBeenCalledWith(['room_a']);
  });

  it('getRoom throws ROOM_NOT_FOUND when missing', async () => {
    let err: unknown;
    try {
      await service.getRoom('room_missing');
    } catch (e: unknown) {
      err = e;
    }
    expect(err).toBeInstanceOf(ApiException);
    expect((err as ApiException).errorCode).toBe(ErrorCodes.ROOM_NOT_FOUND);
    expect((err as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
  });

  it('getRoom returns activeUsers from Redis', async () => {
    const row = {
      id: 'room_a',
      name: 'general',
      createdAt: new Date('2024-03-01T10:00:00.000Z'),
      createdBy: 'ali_123',
    };
    selectFrom.mockReturnValue({
      innerJoin: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([row]),
        }),
      }),
    });
    getActiveUserCount.mockResolvedValue(7);

    const result = await service.getRoom('room_a');

    expect(result.activeUsers).toBe(7);
    expect(getActiveUserCount).toHaveBeenCalledWith('room_a');
  });

  it('deleteRoom publishes room:deleted before DB delete, then purges Redis', async () => {
    const order: string[] = [];
    publishRoomDeleted.mockImplementation(() => {
      order.push('publish');
      return Promise.resolve();
    });

    const deleteWhere = jest.fn().mockImplementation(() => {
      order.push('delete');
      return Promise.resolve();
    });

    purgeRoomArtifacts.mockImplementation(() => {
      order.push('purge');
      return Promise.resolve();
    });

    const dbDelete = jest.fn().mockReturnValue({
      where: deleteWhere,
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        RoomsService,
        {
          provide: DatabaseService,
          useValue: {
            db: {
              select: jest.fn().mockReturnValue({
                from: jest.fn().mockReturnValue({
                  where: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue([
                      {
                        id: 'room_x',
                        createdByUserId: 'usr_1',
                      },
                    ]),
                  }),
                }),
              }),
              insert: jest.fn(),
              delete: dbDelete,
            },
          },
        },
        {
          provide: RoomPresenceService,
          useValue: {
            getActiveUserCounts,
            getActiveUserCount,
            purgeRoomArtifacts,
          },
        },
        {
          provide: ChatEventsPublisher,
          useValue: { publishRoomDeleted },
        },
      ],
    }).compile();

    const deleteService = moduleRef.get(RoomsService);
    await deleteService.deleteRoom('room_x', session);

    expect(order).toEqual(['publish', 'delete', 'purge']);
    expect(purgeRoomArtifacts).toHaveBeenCalledWith('room_x');
  });

  it('createRoom maps unique violation to ROOM_NAME_TAKEN', async () => {
    const dup = new DatabaseError(
      'duplicate key value violates unique constraint',
    );
    dup.code = '23505';
    insertChain.returning.mockRejectedValue(dup);

    await expect(service.createRoom('general', session)).rejects.toMatchObject({
      errorCode: ErrorCodes.ROOM_NAME_TAKEN,
    });
  });
});
