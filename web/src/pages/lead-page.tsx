import type { Lead } from '../sample/types.ts';
import { NotConnectedAction } from '../ui/not-connected-action.tsx';
import { PageHeader } from '../ui/page-header.tsx';
import { Table } from '../ui/table.tsx';

export function LeadPage({ lead }: { lead: Lead }) {
  return (
    <>
      <PageHeader title={lead.name}>
        <span className="strong" data-lead-status="">
          {lead.status}
        </span>{' '}
        since {lead.statusDate}
        {lead.flags.length > 0 && <> · Flags: {lead.flags.join(', ')}</>}
      </PageHeader>
      <dl className="facts">
        <dt>Client type</dt>
        <dd>{lead.clientType}</dd>
        <dt>Language</dt>
        <dd>{lead.language}</dd>
        <dt>Time zone</dt>
        <dd>{lead.timeZone ?? 'not known'}</dd>
      </dl>
      <div className="actions">
        <NotConnectedAction action="changeClientType" />
        <NotConnectedAction action="recordReply" />
        <NotConnectedAction action="eraseLead" />
      </div>
      <h2>Facts</h2>
      <Table
        head={['Fact', 'Value', 'Source']}
        rows={lead.facts.map((fact) => [fact.fact, fact.value, fact.source])}
      />
      <h2>History</h2>
      <Table
        head={['Date', 'Event']}
        rows={lead.history.map((entry) => [entry.date, entry.event])}
      />
    </>
  );
}
