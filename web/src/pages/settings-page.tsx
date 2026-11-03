import {
  dailyLimits,
  doNotContactCount,
  mailbox,
  markets,
  sendWindows,
} from '../sample/settings.ts';
import { NotConnectedAction, NotConnectedForm } from '../ui/not-connected-action.tsx';
import { PageHeader } from '../ui/page-header.tsx';
import { Table } from '../ui/table.tsx';

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings">Limits, send windows, markets, mailbox and privacy.</PageHeader>
      <NotConnectedForm action="saveLimits">
        <h2>Daily limits</h2>
        <div className="form">
          <label>
            New intros a day
            <input name="newIntros" type="number" defaultValue={dailyLimits.newIntros} />
          </label>
          <label>
            Emails a day in total
            <input name="total" type="number" defaultValue={dailyLimits.total} />
          </label>
        </div>
        <h2>Send windows</h2>
        <Table
          head={['Client type', 'Window', 'Saturday']}
          rows={sendWindows.map((row) => [
            row.clientType,
            row.window,
            <input
              type="checkbox"
              aria-label={`Saturday for ${row.clientType}`}
              defaultChecked={row.saturday}
            />,
          ])}
        />
        <p className="muted">Sunday is never a sending day.</p>
      </NotConnectedForm>
      <h2>Active markets</h2>
      <NotConnectedForm action="saveMarkets">
        <div className="form" style={{ marginBottom: 24 }}>
          {markets.map((market) => (
            <label key={market.name} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <input type="checkbox" defaultChecked={market.active} />
              {market.name}
            </label>
          ))}
        </div>
      </NotConnectedForm>
      <h2>Mailbox</h2>
      <p>
        {mailbox.address}: {mailbox.status}
      </p>
      <NotConnectedAction action="checkMailbox" />
      <h2>Do-not-contact list</h2>
      <p>{doNotContactCount} addresses, stored hashed.</p>
      <NotConnectedForm action="addDoNotContact" clear className="form">
        <label>
          Add an address
          <input name="address" type="email" autoComplete="off" />
        </label>
      </NotConnectedForm>
      <h2>Personal data requests</h2>
      <div className="actions">
        <NotConnectedAction action="eraseData" />
        <NotConnectedAction action="exportData" />
      </div>
    </>
  );
}
