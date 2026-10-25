import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// The owner's settings, owned by the platform module.
export const appSetting = pgTable('app_setting', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
