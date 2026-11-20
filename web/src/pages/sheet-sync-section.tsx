import { useEffect, useState } from 'react';
import { ApiError } from '../api/client.ts';
import {
  getLatestSync,
  startSheetSync,
  triggerName,
  type LatestSync,
  type SyncReport,
} from '../api/sheet.ts';
import { formatDateTime } from '../app/format.ts';
import { Link } from '../app/link.tsx';
import { SectionHeading } from '../ui/section-heading.tsx';
import { Table } from '../ui/table.tsx';

// While a sync runs, Find leads asks for its report this often.
export const SYNC_POLL_MS = 2000;

// "No email: 1 row", "No email: 12 rows"; nothing when no row lacked an email.
function noEmailText(count: number | null): string | null {
  if (!count) return null;
  return `No email: ${count} ${count === 1 ? 'row' : 'rows'}`;
}

function Report({ sync }: { sync: SyncReport }) {
  const when = formatDateTime(sync.finishedAt ?? sync.startedAt);
  if (sync.status === 'failed') {
    return (
      <p className="alert" data-sync-failure="">
        Sync failed, {when}, {triggerName(sync.trigger)}: {sync.failure}
      </p>
    );
  }
  const lines = sync.lines ?? [];
  const noEmail = noEmailText(sync.noEmailCount);
  return (
    <div data-sync-report="">
      <p>
        {when}, {triggerName(sync.trigger)}
      </p>
      <p className="strong">
        {sync.createdCount ?? 0} leads created, of which {sync.flaggedCount ?? 0} flagged ·{' '}
        {sync.skippedCount ?? 0} rows skipped
      </p>
      {noEmail && <p data-sync-no-email="">{noEmail}</p>}
      {lines.length > 0 && (
        <Table
          head={['Row', 'Result', 'Reasons']}
          rows={lines.map((line) => [
            String(line.row),
            line.outcome === 'skipped' ? 'Skipped' : 'Created',
            line.reasons.join(', '),
          ])}
        />
      )}
    </div>
  );
}

/** Find leads' "Google Sheet" section: Sync now and the last sync's report. */
export function SheetSyncSection() {
  const [latest, setLatest] = useState<LatestSync | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  // Each change asks for the last report again.
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getLatestSync()
      .then((loaded) => {
        if (!cancelled) setLatest(loaded);
      })
      .catch((error: unknown) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const running = latest?.sync?.status === 'running';
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setReload((count) => count + 1), SYNC_POLL_MS);
    return () => clearTimeout(timer);
  }, [running, latest]);

  async function syncNow() {
    setStarting(true);
    setMessage(null);
    try {
      await startSheetSync();
    } catch (error) {
      // 409: "A sync is already running", or no link any more.
      setMessage(error instanceof ApiError ? error.message : String(error));
    }
    setStarting(false);
    setReload((count) => count + 1);
  }

  const linkSet = latest?.linkSet ?? false;
  return (
    <section data-section="google-sheet">
      <SectionHeading title="Google Sheet" />
      <p className="muted">Import the sheet's rows that are not leads yet.</p>
      <div className="actions">
        <button
          type="button"
          className="button button-primary"
          disabled={!linkSet || running || starting}
          onClick={() => void syncNow()}
        >
          Sync now
        </button>
      </div>
      {latest && !linkSet && (
        <p>
          <Link href="/settings">Set the sheet link in Settings</Link>
        </p>
      )}
      {message && (
        <p className="alert" role="alert">
          {message}
        </p>
      )}
      {running && latest?.sync && (
        <p data-sync-running="">Sync running since {formatDateTime(latest.sync.startedAt)}</p>
      )}
      {latest?.sync && !running && <Report sync={latest.sync} />}
    </section>
  );
}
