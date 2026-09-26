import {
  boolean,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  system: boolean('system').notNull().default(false),
});

export const permissions = pgTable('permissions', {
  key: text('key').primaryKey(),
});

export const profilePermissions = pgTable(
  'profile_permissions',
  {
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id),
    permissionKey: text('permission_key')
      .notNull()
      .references(() => permissions.key),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.permissionKey] }),
  ],
);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
