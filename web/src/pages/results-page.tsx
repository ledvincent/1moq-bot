import { byClientType, byMarket, periods, totals, type ResultRow } from '../sample/results.ts';
import { NotConnectedForm } from '../ui/not-connected-action.tsx';
import { PageHeader } from '../ui/page-header.tsx';
import { Stat } from '../ui/stat.tsx';
import { Table } from '../ui/table.tsx';

const head = ['', 'Found', 'Approved', 'Sent', 'Replies', 'Reply rate', 'Opt-outs', 'Bounces'];

function rows(list: ResultRow[]) {
  return list.map((row) => [
    row.group,
    row.found,
    row.approved,
    row.sent,
    row.replies,
    row.replyRate,
    row.optOuts,
    row.bounces,
  ]);
}

export function ResultsPage() {
  return (
    <>
      <PageHeader title="Results">How the outreach is doing.</PageHeader>
      <NotConnectedForm action="changePeriod" className="form">
        <label>
          Period
          <select name="period">
            {periods.map((period) => (
              <option key={period}>{period}</option>
            ))}
          </select>
        </label>
      </NotConnectedForm>
      <div className="stats" style={{ marginTop: 40 }}>
        <Stat value={totals.found} label="Found" />
        <Stat value={totals.approved} label="Approved" />
        <Stat value={totals.sent} label="Sent" />
        <Stat value={totals.replyRate} label="Reply rate" />
      </div>
      <h2>By client type</h2>
      <Table head={head} rows={rows(byClientType)} />
      <h2>By market</h2>
      <Table head={head} rows={rows(byMarket)} />
    </>
  );
}
