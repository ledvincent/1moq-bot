import { customType, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// The do-not-contact list, owned by the compliance module (okf/domain/do-not-contact-list.md).
// A trigger, added by a custom migration, refuses DELETE and TRUNCATE: the list is never emptied.

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' });

export const doNotContact = pgTable('do_not_contact', {
  // Keyed hash of the normalised address (platform's keyedHash, kind `email`): never readable.
  addressHash: bytea('address_hash').primaryKey(),
  reason: text('reason'),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
});
