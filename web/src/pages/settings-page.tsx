import {
  dailyLimits,
  doNotContactCount,
  mailbox,
  markets,
  sendWindows,
} from '../sample/settings.ts';
import { NotConnectedAction, NotConnectedForm } from '../ui/not-connected-action.tsx';
import { PageHeader } from '../ui/page-header.tsx';
import { SectionHeading } from '../ui/section-heading.tsx';
import { Table } from '../ui/table.tsx';
import { SheetSettingsSection } from './sheet-settings-section.tsx';

// The Google Sheet section is real; the others are still on sample data and say so.
export function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" sample={false}>
        Google Sheet, limits, send windows, markets, mailbox and privacy.
      </PageHeader>
      <SheetSettingsSection />
      <NotConnectedForm action="saveLimits">
        <SectionHeading title="Daily limits" sample />
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
        <SectionHeading title="Send windows" sample />
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
      <SectionHeading title="Active markets" sample />
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
      <SectionHeading title="Mailbox" sample />
      <p>
        {mailbox.address}: {mailbox.status}
      </p>
      <NotConnectedAction action="checkMailbox" />
      <SectionHeading title="Do-not-contact list" sample />
      <p>{doNotContactCount} addresses, stored hashed.</p>
      <NotConnectedForm action="addDoNotContact" clear className="form">
        <label>
          Add an address
          <input name="address" type="email" autoComplete="off" />
        </label>
      </NotConnectedForm>
      <SectionHeading title="Personal data requests" sample />
      <div className="actions">
        <NotConnectedAction action="eraseData" />
        <NotConnectedAction action="exportData" />
      </div>
    </>
  );
}
