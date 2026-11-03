import { useState } from 'react';
import { Link } from '../app/link.tsx';
import { leads } from '../sample/leads.ts';
import { leadStatuses } from '../sample/types.ts';
import { PageHeader } from '../ui/page-header.tsx';
import { Table } from '../ui/table.tsx';

export function LeadsPage() {
  const [status, setStatus] = useState('all');
  const shown = status === 'all' ? leads : leads.filter((lead) => lead.status === status);
  return (
    <>
      <PageHeader title="Leads">Every lead and where it stands.</PageHeader>
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
      <Table
        head={['Name', 'Client type', 'Market', 'Status', 'Fit', 'Last change']}
        rows={shown.map((lead) => [
          <Link href={`/leads/${lead.id}`}>{lead.name}</Link>,
          lead.clientType,
          lead.market,
          lead.status,
          lead.fit,
          lead.statusDate,
        ])}
      />
    </>
  );
}
