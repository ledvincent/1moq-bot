import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// The owner's settings, owned by the platform module.
export const appSetting = pgTable('app_setting', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Each module's tables, re-exported so the migrations and the typed client see every table
// (okf/decisions/MOQ-2-folder-layout.md).
export {
  lead,
  leadEmail,
  leadFact,
  leadImportPosition,
  leadSource,
  seenBusiness,
  sheetSync,
} from '../../sourcing/schema.ts';
export { doNotContact } from '../../compliance/schema.ts';
