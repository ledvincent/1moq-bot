import { Link } from '../app/link.tsx';
import { dmsDue, queuedEmails, replies, sending, sentEmails } from '../sample/emails.ts';
import { findLead, leads } from '../sample/leads.ts';
import { NotConnectedAction } from '../ui/not-connected-action.tsx';
import { PageHeader } from '../ui/page-header.tsx';
import { Table } from '../ui/table.tsx';

function leadLink(id: string) {
  return <Link href={`/leads/${id}`}>{findLead(id)?.name ?? id}</Link>;
}

export function EmailsPage() {
  return (
    <>
      <PageHeader title="Emails">
        Sending is <span className="strong">{sending.state}</span>.
      </PageHeader>
      <NotConnectedAction action="pauseSending" />
      <h2>Queued</h2>
      <Table
        head={['Lead', 'Step', "Send time (lead's time zone)", '']}
        rows={queuedEmails.map((email) => [
          leadLink(email.leadId),
          email.step,
          email.sendTime,
          <NotConnectedAction action="sendNow" />,
        ])}
      />
      <h2>Sent</h2>
      <Table
        head={['Lead', 'Step', 'Sent']}
        rows={sentEmails.map((email) => [leadLink(email.leadId), email.step, email.sentAt])}
      />
      <h2>Replies</h2>
      <Table
        head={['Lead', 'Received', 'Reply']}
        rows={replies.map((reply) => [leadLink(reply.leadId), reply.receivedAt, reply.summary])}
      />
      <h2>Instagram DMs due</h2>
      <Table
        head={['Lead', 'Instagram', 'Due', '']}
        rows={dmsDue.map((dm) => [
          leadLink(dm.leadId),
          findLead(dm.leadId)?.instagram ?? '',
          dm.due,
          <NotConnectedAction action="markDmSent" />,
        ])}
      />
      <h2>To contact by hand</h2>
      <Table
        head={['Lead', 'Instagram', 'Website']}
        rows={leads
          .filter((lead) => lead.status === 'to contact by hand')
          .map((lead) => [leadLink(lead.id), lead.instagram ?? '', lead.website])}
      />
    </>
  );
}
