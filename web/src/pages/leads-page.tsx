import { useEffect, useState } from 'react';
import { listLeads, type LeadSummary } from '../api/leads.ts';
import { formatDate } from '../app/format.ts';
import { Link } from '../app/link.tsx';
import { leadStatuses } from '../sample/types.ts';
import { PageHeader } from '../ui/page-header.tsx';
import { Table } from '../ui/table.tsx';

const UNKNOWN = '–';

/** Leads: every real lead, read only, with the status filter. */
export function LeadsPage() {
  const [leads, setLeads] = useState<LeadSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('all');

  useEffect(() => {
    let cancelled = false;
    listLeads()
      .then((loaded) => !cancelled && setLeads(loaded))
      .catch((failure: unknown) => {
        if (!cancelled) setError(failure instanceof Error ? failure.message : String(failure));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shown =
    leads && (status === 'all' ? leads : leads.filter((lead) => lead.status === status));
  return (
    <>
      <PageHeader title="Leads" sample={false}>
        Every lead and where it stands.
      </PageHeader>
      <label style={{ maxWidth: 280, marginBottom: 24 }}>
        Status
        <select
          name="status"
          value={status}
          onChange={(event) => setStatus(event.currentTarget.value)}
        >
          <option value="all">All statuses</option>
          {leadStatuses.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {!leads && !error && <p className="muted">Loading the leads…</p>}
      {leads?.length === 0 && (
        <p data-empty="">
          No leads yet. Sync the Google Sheet on <Link href="/find">Find leads</Link>.
        </p>
      )}
      {shown && shown.length > 0 && (
        <Table
          head={[
            'Name',
            'Client type',
            'Status',
            'Sources',
            'Flags',
            'Market',
            'Fit',
            'Last change',
          ]}
          rows={shown.map((lead) => [
            <Link href={`/leads/${encodeURIComponent(lead.id)}`}>{lead.name}</Link>,
            lead.clientType ?? UNKNOWN,
            lead.status,
            lead.sources.join(', '),
            lead.flags.join(', '),
            // No lead has a market yet: it comes with the Google Maps search.
            UNKNOWN,
            lead.fitLevel ?? UNKNOWN,
            formatDate(lead.statusChangedAt),
          ])}
        />
      )}
    </>
  );
}
