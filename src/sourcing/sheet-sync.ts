import { and, desc, eq, sql } from 'drizzle-orm';
import { isOnDoNotContactList } from '../compliance/index.ts';
import type { Db, Executor } from '../platform/db/client.ts';
import { readSetting } from '../platform/settings.ts';
import { assessRow, type LeadCandidate } from './row-rules.ts';
import { lead, leadEmail, leadFact, leadSource, sheetSync, type SyncReportLine } from './schema.ts';
import { isAlreadyDecided } from './seen-business.ts';
import { SHEET_LINK_SETTING, type SheetLink } from './sheet-link.ts';
import { readSheetRows, SheetLayoutError } from './sheet-rows.ts';
import { SheetReadError, type SheetSource } from './sheet-source.ts';

// One code path for Sync now and the daily sync: all or nothing, one at a time
// (openspec/specs/lead-sourcing/spec.md, "Sync leads from the Google Sheet" to "One sync at a time";
// okf/decisions/MOQ-31-google-sheet-lead-source.md).

export type SyncTrigger = 'now' | 'daily';

/** Where sync events are logged: ids, triggers, counts and failure kinds only. */
export interface SyncLog {
  info(data: object, message: string): void;
  error(data: object, message: string): void;
}

/** Writes sync events to the process output as one line each. */
export const consoleSyncLog: SyncLog = {
  info: (data, message) => console.log(message, JSON.stringify(data)),
  error: (data, message) => console.error(message, JSON.stringify(data)),
};

export interface SyncDeps {
  db: Db;
  sheetSource: SheetSource;
  matchHashKey: string;
  // The service account's email, named in the "not shared" reason; null when not set up.
  serviceAccountEmail: string | null;
  log: SyncLog;
}

export const ALREADY_RUNNING = 'A sync is already running';
export const NO_SHEET_LINK = 'No sheet link is set';
const STOPPED_BEFORE_THE_END = 'The sync stopped before the end. Nothing was imported.';
const RESTARTED = 'The tool restarted during the sync. Nothing was imported.';

export type StartResult =
  | { started: true; id: string }
  | { started: false; reason: typeof ALREADY_RUNNING | typeof NO_SHEET_LINK };

function isUniqueViolation(error: unknown, constraint: string): boolean {
  const cause = (error as { cause?: unknown }).cause ?? error;
  const { code, constraint: name } = cause as { code?: string; constraint?: string };
  return code === '23505' && name === constraint;
}

/**
 * Starts a sync: refused without a sheet link, or while another sync runs (the database allows
 * one `running` sync). A started sync is a `running` report row; runSync does the work.
 */
export async function startSync(db: Db, trigger: SyncTrigger): Promise<StartResult> {
  const link = await readSetting<SheetLink>(db, SHEET_LINK_SETTING);
  if (!link) return { started: false, reason: NO_SHEET_LINK };
  try {
    const [row] = await db
      .insert(sheetSync)
      .values({ trigger, status: 'running' })
      .returning({ id: sheetSync.id });
    return { started: true, id: row!.id };
  } catch (error) {
    if (isUniqueViolation(error, 'sheet_sync_one_running')) {
      return { started: false, reason: ALREADY_RUNNING };
    }
    throw error;
  }
}

/** Why a sync failed, as the log records it: a kind, never a message that may hold a cell. */
type FailureKind = SheetReadError['kind'] | 'layout' | 'no-link' | 'error';

class NoLinkError extends Error {}

function failureKind(error: unknown): FailureKind {
  if (error instanceof SheetReadError) return error.kind;
  if (error instanceof SheetLayoutError) return 'layout';
  if (error instanceof NoLinkError) return 'no-link';
  return 'error';
}

/** The reason the owner reads on Find leads for a failed sync (design D6). */
export function failureReason(error: unknown, serviceAccountEmail: string | null): string {
  if (error instanceof SheetLayoutError) return error.message;
  if (error instanceof NoLinkError) return `${NO_SHEET_LINK}.`;
  if (!(error instanceof SheetReadError)) return STOPPED_BEFORE_THE_END;
  switch (error.kind) {
    case 'not-shared':
      return `The sheet is not shared with the tool. Share it with ${serviceAccountEmail ?? "the tool's service account"} as Viewer.`;
    case 'not-found':
      return 'The sheet cannot be found. Check the link on Settings.';
    case 'unavailable':
      return 'Google could not be reached. Try again later.';
    case 'access-refused':
      return "Google refused the tool's access key. The service account key needs checking.";
    case 'not-set-up':
      return "The tool's Google access is not set up.";
  }
}

/**
 * Logs the end of a sync: its id, trigger, and its counts or its failure kind (with the error's
 * name and database code). Never an error message, a cell value, an address or the link.
 */
export function logSyncEnd(
  log: SyncLog,
  sync: { id: string; trigger: SyncTrigger },
  outcome:
    | { kind: 'done'; created: number; flagged: number; skipped: number }
    | { kind: 'failed'; error: unknown },
): void {
  if (outcome.kind === 'done') {
    const { created, flagged, skipped } = outcome;
    log.info(
      { syncId: sync.id, trigger: sync.trigger, created, flagged, skipped },
      'Sheet sync done',
    );
    return;
  }
  const { error } = outcome;
  const cause = (error as { cause?: unknown } | null)?.cause ?? error;
  const code = (cause as { code?: unknown } | null)?.code;
  log.error(
    {
      syncId: sync.id,
      trigger: sync.trigger,
      failure: failureKind(error),
      errorName: error instanceof Error ? error.name : typeof error,
      ...(typeof code === 'string' && /^[A-Z0-9_]{1,10}$/.test(code) ? { errorCode: code } : {}),
    },
    'Sheet sync failed',
  );
}

// The lead a candidate matches by email, else website domain, else Instagram handle.
async function matchingLead(tx: Executor, candidate: LeadCandidate): Promise<string | null> {
  const byEmail = await tx
    .select({ id: leadEmail.leadId })
    .from(leadEmail)
    .where(eq(leadEmail.addressNormalised, candidate.email.normalised));
  if (byEmail[0]) return byEmail[0].id;
  if (candidate.websiteDomain) {
    const byDomain = await tx
      .select({ id: lead.id })
      .from(lead)
      .where(eq(lead.websiteDomain, candidate.websiteDomain));
    if (byDomain[0]) return byDomain[0].id;
  }
  if (candidate.instagramHandle) {
    const byHandle = await tx
      .select({ id: lead.id })
      .from(lead)
      .where(eq(lead.instagramHandle, candidate.instagramHandle));
    if (byHandle[0]) return byHandle[0].id;
  }
  return null;
}

async function createLead(tx: Executor, syncId: string, candidate: LeadCandidate): Promise<void> {
  const [created] = await tx
    .insert(lead)
    .values({
      name: candidate.name,
      status: 'waiting for review',
      clientType: candidate.clientType,
      language: candidate.language,
      timeZone: candidate.timeZone,
      flags: candidate.flags,
      websiteDomain: candidate.websiteDomain,
      instagramHandle: candidate.instagramHandle,
      importPosition: sql`nextval('lead_import_position')`,
    })
    .returning({ id: lead.id });
  const leadId = created!.id;
  await tx.insert(leadEmail).values({
    leadId,
    address: candidate.email.address,
    addressNormalised: candidate.email.normalised,
    source: 'Google Sheet',
  });
  if (candidate.facts.length > 0) {
    await tx
      .insert(leadFact)
      .values(
        candidate.facts.map((fact) => ({ leadId, ...fact, source: 'Google Sheet' as const })),
      );
  }
  await tx
    .insert(leadSource)
    .values({ leadId, source: 'Google Sheet', sheetSyncId: syncId, sheetRow: candidate.rowNumber });
}

export interface RunOptions {
  // Tests only: called after each row is handled, inside the transaction.
  afterRow?: (rowNumber: number) => Promise<void> | void;
}

/**
 * Runs a started sync: reads the sheet's first tab (outside any transaction), then handles every
 * row in order in one transaction and saves the report. Any failure keeps nothing from the sync
 * and saves the failure's reason instead. A sync no longer `running` is left as it is.
 */
export async function runSync(
  deps: SyncDeps,
  syncId: string,
  options: RunOptions = {},
): Promise<void> {
  const { db } = deps;
  const [sync] = await db
    .select({ id: sheetSync.id, trigger: sheetSync.trigger, status: sheetSync.status })
    .from(sheetSync)
    .where(eq(sheetSync.id, syncId));
  if (!sync || sync.status !== 'running') return;

  try {
    const link = await readSetting<SheetLink>(db, SHEET_LINK_SETTING);
    if (!link) throw new NoLinkError();
    const rows = readSheetRows(await deps.sheetSource.readFirstTab(link.spreadsheetId));

    const counts = await db.transaction(async (tx) => {
      const lines: SyncReportLine[] = [];
      let created = 0;
      let flagged = 0;
      let skipped = 0;
      let noEmail = 0;
      const skip = (row: number, reason: string) => {
        skipped += 1;
        // Counted, not listed: DM-only leads would otherwise fill every report (design D5).
        if (reason === 'no email') noEmail += 1;
        else lines.push({ row, outcome: 'skipped', reasons: [reason] });
      };

      for (const row of rows) {
        const assessed = assessRow(row);
        if ('skip' in assessed) {
          skip(row.rowNumber, assessed.skip);
        } else {
          const { candidate } = assessed;
          const existing = await matchingLeadUnlessBlocked(tx, deps.matchHashKey, candidate);
          if (existing.blocked) {
            skip(row.rowNumber, existing.blocked);
          } else if (existing.leadId) {
            // A duplicate only adds the source; nothing else of the lead changes.
            await tx
              .insert(leadSource)
              .values({
                leadId: existing.leadId,
                source: 'Google Sheet',
                sheetSyncId: syncId,
                sheetRow: row.rowNumber,
              })
              .onConflictDoNothing();
            skip(row.rowNumber, 'duplicate');
          } else {
            await createLead(tx, syncId, candidate);
            created += 1;
            if (candidate.flags.length > 0) flagged += 1;
            const reasons = [...candidate.flags, ...candidate.notes];
            if (reasons.length > 0) lines.push({ row: row.rowNumber, outcome: 'created', reasons });
          }
        }
        await options.afterRow?.(row.rowNumber);
      }

      const finished = await tx
        .update(sheetSync)
        .set({
          status: 'done',
          finishedAt: new Date(),
          createdCount: created,
          flaggedCount: flagged,
          skippedCount: skipped,
          noEmailCount: noEmail,
          lines,
        })
        .where(and(eq(sheetSync.id, syncId), eq(sheetSync.status, 'running')))
        .returning({ id: sheetSync.id });
      // Marked failed meanwhile (a restart of another instance): keep nothing.
      if (finished.length === 0) throw new Error('Sync no longer running');
      return { created, flagged, skipped };
    });
    logSyncEnd(deps.log, sync, { kind: 'done', ...counts });
  } catch (error) {
    await db
      .update(sheetSync)
      .set({
        status: 'failed',
        finishedAt: new Date(),
        failure: failureReason(error, deps.serviceAccountEmail),
      })
      .where(and(eq(sheetSync.id, syncId), eq(sheetSync.status, 'running')));
    logSyncEnd(deps.log, sync, { kind: 'failed', error });
  }
}

// The checks of a candidate that ask the database, in order: do-not-contact, already decided,
// then duplicate (earlier rows of this sync included: they are already written).
async function matchingLeadUnlessBlocked(
  tx: Executor,
  matchHashKey: string,
  candidate: LeadCandidate,
): Promise<{ blocked?: 'do not contact' | 'already decided'; leadId?: string | null }> {
  if (await isOnDoNotContactList(tx, matchHashKey, candidate.email.normalised)) {
    return { blocked: 'do not contact' };
  }
  const keys = {
    email: candidate.email.normalised,
    websiteDomain: candidate.websiteDomain,
    instagramHandle: candidate.instagramHandle,
  };
  if (await isAlreadyDecided(tx, matchHashKey, keys)) return { blocked: 'already decided' };
  return { leadId: await matchingLead(tx, candidate) };
}

/**
 * The daily sync: starts and runs a sync like Sync now. Without a sheet link it does nothing and
 * leaves no report; while another sync runs it logs that and stops.
 */
export async function runDailySync(deps: SyncDeps, options: RunOptions = {}): Promise<void> {
  const start = await startSync(deps.db, 'daily');
  if (!start.started) {
    if (start.reason === ALREADY_RUNNING) {
      deps.log.info({ trigger: 'daily' }, 'Daily sheet sync skipped: a sync is already running');
    }
    return;
  }
  await runSync(deps, start.id, options);
}

/** Marks a started sync failed when its run could not even be queued. */
export async function failUnqueuedSync(db: Db, syncId: string): Promise<void> {
  await db
    .update(sheetSync)
    .set({ status: 'failed', finishedAt: new Date(), failure: STOPPED_BEFORE_THE_END })
    .where(and(eq(sheetSync.id, syncId), eq(sheetSync.status, 'running')));
}

/**
 * At start-up, before the jobs run: a sync still `running` was cut by a restart, so it is marked
 * failed and the next sync can start. Returns how many were.
 */
export async function failInterruptedSyncs(db: Db): Promise<number> {
  const rows = await db
    .update(sheetSync)
    .set({ status: 'failed', finishedAt: new Date(), failure: RESTARTED })
    .where(eq(sheetSync.status, 'running'))
    .returning({ id: sheetSync.id });
  return rows.length;
}

/** The report of the last sync, running, done or failed, as Find leads shows it; null before any. */
export async function latestSync(db: Db) {
  const [row] = await db
    .select({
      id: sheetSync.id,
      trigger: sheetSync.trigger,
      status: sheetSync.status,
      startedAt: sheetSync.startedAt,
      finishedAt: sheetSync.finishedAt,
      createdCount: sheetSync.createdCount,
      flaggedCount: sheetSync.flaggedCount,
      skippedCount: sheetSync.skippedCount,
      noEmailCount: sheetSync.noEmailCount,
      lines: sheetSync.lines,
      failure: sheetSync.failure,
    })
    .from(sheetSync)
    .orderBy(desc(sheetSync.startedAt))
    .limit(1);
  return row ?? null;
}
