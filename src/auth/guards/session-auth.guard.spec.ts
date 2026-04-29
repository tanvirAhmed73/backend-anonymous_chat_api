import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionAuthGuard } from './session-auth.guard';
import { IS_PUBLIC_KEY } from '../constants';
import { SessionService } from '../session.service';

describe('SessionAuthGuard', () => {
  let guard: SessionAuthGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let sessions: { getByToken: jest.Mock };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    sessions = { getByToken: jest.fn() };
    guard = new SessionAuthGuard(
      reflector as unknown as Reflector,
      sessions as unknown as SessionService,
    );
  });

  function ctx(headers: Record<string, string>): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows public routes without a token', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) {
        return true;
      }
      return undefined;
    });

    await expect(guard.canActivate(ctx({}))).resolves.toBe(true);
    expect(sessions.getByToken).not.toHaveBeenCalled();
  });

  it('rejects missing Bearer token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    await expect(guard.canActivate(ctx({}))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches sessionUser when token is valid', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    sessions.getByToken.mockResolvedValue({
      id: 'usr_x',
      username: 'u',
      createdAt: '2024-01-01T00:00:00.000Z',
    });

    const req: { headers: Record<string, string>; sessionUser?: unknown } = {
      headers: { authorization: 'Bearer valid-token' },
    };

    const executionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(executionContext)).resolves.toBe(true);
    expect(req.sessionUser?.username).toBe('u');
  });
});
