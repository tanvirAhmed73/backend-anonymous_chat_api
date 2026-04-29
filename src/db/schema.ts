import { index, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

/** Public ids use prefixes usr_*, room_*, msg_* (generated in application code). */
export const users = pgTable('users', {
  id: varchar('id', { length: 48 }).primaryKey(),
  username: varchar('username', { length: 24 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const rooms = pgTable('rooms', {
  id: varchar('id', { length: 48 }).primaryKey(),
  name: varchar('name', { length: 32 }).notNull().unique(),
  createdByUserId: varchar('created_by_user_id', { length: 48 })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const messages = pgTable(
  'messages',
  {
    id: varchar('id', { length: 48 }).primaryKey(),
    roomId: varchar('room_id', { length: 48 })
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 48 })
      .notNull()
      .references(() => users.id),
    username: varchar('username', { length: 24 }).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    roomCreatedIdx: index('messages_room_id_created_at_idx').on(
      t.roomId,
      t.createdAt,
    ),
  }),
);
