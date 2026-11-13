import { getJson, sendJson } from './client.ts';

// The Google Sheet: its link on Settings, and its syncs on Find leads.

export interface SheetSettings {
  link: string | null;
  // The service account to share the sheet with; null when Google access is not set up.
  serviceAccountEmail: string | null;
}

export interface SyncReportLine {
  row: number;
  outcome: 'skipped' | 'created';
  reasons: string[];
}

export interface SyncReport {
  id: string;
  trigger: 'now' | 'daily';
  status: 'running' | 'done' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  createdCount: number | null;
  flaggedCount: number | null;
  skippedCount: number | null;
  // Rows skipped for "no email": counted in skippedCount, never listed in lines.
  noEmailCount: number | null;
  lines: SyncReportLine[] | null;
  failure: string | null;
}

export interface LatestSync {
  linkSet: boolean;
  sync: SyncReport | null;
}

export function getSheetSettings(): Promise<SheetSettings> {
  return getJson('/api/settings/sheet');
}

/** Saves the sheet link; an empty one clears it. Refused (ApiError) when not a Google Sheets link. */
export function saveSheetLink(link: string): Promise<{ link: string | null }> {
  return sendJson('PUT', '/api/settings/sheet', { link });
}

export function getLatestSync(): Promise<LatestSync> {
  return getJson('/api/sheet-syncs/latest');
}

/** Starts a sync; refused (ApiError 409) while one runs or without a link. */
export function startSheetSync(): Promise<{ id: string }> {
  return sendJson('POST', '/api/sheet-syncs');
}

/** How a sync's trigger is named on the page. */
export function triggerName(trigger: SyncReport['trigger']): string {
  return trigger === 'now' ? 'Sync now' : 'daily sync';
}
