import { Link } from '../app/link.tsx';
import { overview } from '../sample/overview.ts';
import { PageHeader } from '../ui/page-header.tsx';
import { Stat } from '../ui/stat.tsx';

export function OverviewPage() {
  return (
    <>
      <PageHeader title="Overview">What needs you today.</PageHeader>
      <div className="stats">
        <Link href="/review">
          <Stat value={overview.waitingForReview} label="Leads waiting for review" />
        </Link>
        <Link href="/emails">
          <Stat value={overview.emailsToday} label="Emails going out today" />
        </Link>
        <Link href="/emails">
          <Stat value={overview.newReplies} label="New replies" />
        </Link>
        <Link href="/emails">
          <Stat value={overview.sending === 'on' ? 'On' : 'Paused'} label="Sending" />
        </Link>
      </div>
    </>
  );
}
