import {
  factName,
  languageName,
  orderedFacts,
  type LeadDetails,
  type LeadSourceEntry,
} from '../api/leads.ts';
import { formatDate } from '../app/format.ts';
import { NotConnectedAction } from '../ui/not-connected-action.tsx';
import { PageHeader } from '../ui/page-header.tsx';
import { Table } from '../ui/table.tsx';

// Sheet text is shown as text only, never as HTML or a link; it keeps its line breaks.
const text = (value: string) => <span className="long-text">{value}</span>;

function historyEvent(source: LeadSourceEntry): string {
  if (source.source === 'Google Sheet') {
    return source.sheetRow === null
      ? 'Imported from the Google Sheet'
      : `Imported from the Google Sheet, row ${source.sheetRow}`;
  }
  return `Found by ${source.source}`;
}

/** A lead's own page, read only: its values with their source, its sources and its history. */
export function LeadPage({ lead }: { lead: LeadDetails }) {
  return (
    <>
      <PageHeader title={lead.name} sample={false}>
        <span className="strong" data-lead-status="">
          {lead.status}
        </span>{' '}
        since {formatDate(lead.statusChangedAt)}
        {lead.flags.length > 0 && <span data-lead-flags=""> · Flags: {lead.flags.join(', ')}</span>}
      </PageHeader>
      <dl className="facts">
        <dt>Client type</dt>
        <dd>{lead.clientType ?? 'not known'}</dd>
        <dt>Language</dt>
        <dd>{languageName(lead.language)}</dd>
        <dt>Time zone</dt>
        <dd>{lead.timeZone ?? 'none'}</dd>
        <dt>Email address</dt>
        <dd>{lead.email ? text(lead.email) : 'none'}</dd>
        <dt>Sources</dt>
        <dd>{lead.sources.map((source) => source.source).join(', ')}</dd>
      </dl>
      <div className="actions">
        <NotConnectedAction action="changeClientType" />
        <NotConnectedAction action="recordReply" />
        <NotConnectedAction action="eraseLead" />
      </div>
      <h2>Facts</h2>
      <Table
        head={['Fact', 'Value', 'Source']}
        rows={orderedFacts(lead.facts).map((fact) => [
          factName(fact.kind),
          text(fact.value),
          fact.source,
        ])}
      />
      <h2>History</h2>
      <Table
        head={['Date', 'Event']}
        rows={lead.sources.map((source) => [formatDate(source.addedAt), historyEvent(source)])}
      />
    </>
  );
}
