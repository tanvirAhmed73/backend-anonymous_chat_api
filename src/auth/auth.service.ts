import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseError } from 'pg';
import { DatabaseService } from '../db/database.service';
import { users } from '../db/schema';
import { generateSessionToken, generateUserId } from '../common/utils/ids';
import { SessionService } from './session.service';
import type { SessionUser } from './types/session-user';

export interface LoginResult {
  sessionToken: string;
  user: SessionUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly sessions: SessionService,
  ) {}

  async login(username: string): Promise<LoginResult> {
    let row = await this.findUserByUsername(username);

    if (!row) {
      const id = generateUserId();
      try {
        const [inserted] = await this.db.db
          .insert(users)
          .values({ id, username })
          .returning();
        row = inserted;
      } catch (err: unknown) {
        if (!(err instanceof DatabaseError) || err.code !== '23505') {
          throw err;
        }
        row = await this.findUserByUsername(username);
      }
    }

    if (!row) {
      throw new Error('Failed to resolve user after insert race');
    }

    const user = this.toSessionUser(row);
    const sessionToken = generateSessionToken();
    await this.sessions.save(sessionToken, user);

    return { sessionToken, user };
  }

  private async findUserByUsername(username: string) {
    const [row] = await this.db.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return row ?? null;
  }

  private toSessionUser(row: {
    id: string;
    username: string;
    createdAt: Date;
  }): SessionUser {
    const createdAt =
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : new Date(row.createdAt).toISOString();

    return {
      id: row.id,
      username: row.username,
      createdAt,
    };
  }
}
