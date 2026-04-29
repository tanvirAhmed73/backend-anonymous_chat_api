import { Test } from '@nestjs/testing';
import { DatabaseService } from '../db/database.service';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

describe('AuthService', () => {
  const existingUser = {
    id: 'usr_test123',
    username: 'ali_123',
    createdAt: new Date('2024-03-01T10:00:00.000Z'),
  };

  let selectLimit: jest.Mock;
  let insertReturning: jest.Mock;
  let save: jest.Mock;
  let service: AuthService;

  beforeEach(async () => {
    selectLimit = jest.fn();
    insertReturning = jest.fn();
    save = jest.fn().mockResolvedValue(undefined);

    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: selectLimit,
          }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: insertReturning,
        }),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DatabaseService, useValue: { db } },
        { provide: SessionService, useValue: { save } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('issues a new session for an existing user (idempotent by username)', async () => {
    selectLimit.mockResolvedValue([existingUser]);

    const result = await service.login('ali_123');

    expect(result.user).toEqual({
      id: 'usr_test123',
      username: 'ali_123',
      createdAt: '2024-03-01T10:00:00.000Z',
    });
    expect(typeof result.sessionToken).toBe('string');
    expect(result.sessionToken.length).toBeGreaterThan(0);
    expect(save).toHaveBeenCalledWith(
      result.sessionToken,
      expect.objectContaining({
        id: 'usr_test123',
        username: 'ali_123',
      }),
    );
    expect(insertReturning).not.toHaveBeenCalled();
  });

  it('creates a user row when username is new', async () => {
    selectLimit.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'usr_new',
        username: 'newbie',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      },
    ]);
    insertReturning.mockResolvedValue([
      {
        id: 'usr_new',
        username: 'newbie',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      },
    ]);

    const result = await service.login('newbie');

    expect(result.user.username).toBe('newbie');
    expect(save).toHaveBeenCalled();
    expect(insertReturning).toHaveBeenCalled();
  });
});
