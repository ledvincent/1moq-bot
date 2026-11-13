import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { clientTypes } from '../platform/client-types.ts';

// The lead tables, owned by the sourcing module (okf/decisions/MOQ-31-lead-tables.md).

/** The lead statuses of okf/domain/lead-status.md. */
export const leadStatuses = [
  'found',
  'waiting for review',
  'approved',
  'rejected',
  'to contact by hand',
  'emailed',
  'replied',
  'opted out',
  'bounced',
  'sequence finished',
] as const;
export type LeadStatus = (typeof leadStatuses)[number];

/** Flags asking for the owner's attention, set when a lead is imported. */
export const leadFlags = [
  'type unknown',
  'no language',
  'no time zone',
  'time zone unclear',
] as const;
export type LeadFlag = (typeof leadFlags)[number];

/** Where a lead was found. Only the Google Sheet is built yet. */
export const leadSources = ['Google Sheet', 'Google Maps', 'Instagram', 'Manual'] as const;
export type LeadSource = (typeof leadSources)[number];

// PostgreSQL bytea, read and written as a Buffer: the keyed hashes.
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

// `in (...)` of a check constraint: literal text values, quotes doubled.
const inList = (values: readonly string[]) =>
  sql.raw(values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', '));

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

// The order leads were created by syncs: follows the sheet's rows, then the order of syncs.
export const leadImportPosition = pgSequence('lead_import_position');

export const lead = pgTable(
  'lead',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    status: text('status').$type<LeadStatus>().notNull(),
    statusChangedAt: timestamp('status_changed_at', { withTimezone: true }).notNull().defaultNow(),
    // Null until known.
    clientType: text('client_type'),
    fitLevel: text('fit_level'),
    language: text('language').$type<'en' | 'fr'>(),
    timeZone: text('time_zone'),
    flags: text('flags')
      .array()
      .$type<LeadFlag[]>()
      .notNull()
      .default(sql`'{}'::text[]`),
    // Match keys (with lead_email.address_normalised): one lead per business.
    websiteDomain: text('website_domain'),
    instagramHandle: text('instagram_handle'),
    importPosition: bigint('import_position', { mode: 'number' }),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('lead_status_check', sql`${table.status} in (${inList(leadStatuses)})`),
    check('lead_client_type_check', sql`${table.clientType} in (${inList(clientTypes)})`),
    check('lead_fit_level_check', sql`${table.fitLevel} in ('good', 'possible', 'poor')`),
    check('lead_language_check', sql`${table.language} in ('en', 'fr')`),
    uniqueIndex('lead_website_domain_unique').on(table.websiteDomain),
    uniqueIndex('lead_instagram_handle_unique').on(table.instagramHandle),
    index('lead_import_position_index').on(table.importPosition),
  ],
);

export const leadEmail = pgTable(
  'lead_email',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => lead.id, { onDelete: 'cascade' }),
    // As written, without surrounding spaces and "mailto:".
    address: text('address').notNull(),
    // The email match key (compliance's normaliseEmail): one lead per address.
    addressNormalised: text('address_normalised').notNull(),
    source: text('source').$type<LeadSource>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('lead_email_address_normalised_unique').on(table.addressNormalised),
    index('lead_email_lead_index').on(table.leadId),
  ],
);

// A fact about a lead with its source; an unknown fact is a missing row.
export const leadFact = pgTable(
  'lead_fact',
  {
    leadId: uuid('lead_id')
      .notNull()
      .references(() => lead.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    value: text('value').notNull(),
    source: text('source').$type<LeadSource>().notNull(),
    foundAt: timestamp('found_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.leadId, table.kind, table.source] })],
);

export const sheetSync = pgTable(
  'sheet_sync',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trigger: text('trigger').$type<'now' | 'daily'>().notNull(),
    status: text('status').$type<'running' | 'done' | 'failed'>().notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdCount: integer('created_count'),
    flaggedCount: integer('flagged_count'),
    skippedCount: integer('skipped_count'),
    // Rows skipped for "no email": counted in skippedCount too, but given no line of their own.
    noEmailCount: integer('no_email_count'),
    // Row numbers and reasons only: never a name or an address.
    lines: jsonb('lines').$type<SyncReportLine[]>(),
    failure: text('failure'),
  },
  (table) => [
    check('sheet_sync_trigger_check', sql`${table.trigger} in ('now', 'daily')`),
    check('sheet_sync_status_check', sql`${table.status} in ('running', 'done', 'failed')`),
    // One sync runs at a time: a second `running` row is refused.
    uniqueIndex('sheet_sync_one_running')
      .on(table.status)
      .where(sql`${table.status} = 'running'`),
    index('sheet_sync_started_at_index').on(table.startedAt),
  ],
);

/** One line of a sync report: a skipped (other than for "no email"), flagged or noted row. */
export interface SyncReportLine {
  row: number;
  outcome: 'skipped' | 'created';
  reasons: string[];
}

// Each source a lead was found in, once.
export const leadSource = pgTable(
  'lead_source',
  {
    leadId: uuid('lead_id')
      .notNull()
      .references(() => lead.id, { onDelete: 'cascade' }),
    source: text('source').$type<LeadSource>().notNull(),
    sheetSyncId: uuid('sheet_sync_id').references(() => sheetSync.id, { onDelete: 'set null' }),
    sheetRow: integer('sheet_row'),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.leadId, table.source] })],
);

// Keyed hashes of the match keys of deleted or erased leads: never readable, never offered again.
export const seenBusiness = pgTable('seen_business', {
  keyHash: bytea('key_hash').primaryKey(),
  lastDecision: text('last_decision'),
  createdAt: createdAt(),
});
