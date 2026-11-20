import { NotConnectedForm } from '../ui/not-connected-action.tsx';
import { PageHeader } from '../ui/page-header.tsx';
import { SectionHeading } from '../ui/section-heading.tsx';
import { Table } from '../ui/table.tsx';
import { SheetSyncSection } from './sheet-sync-section.tsx';

const recentSearches = [
  ['Coffee roasters', 'Brighton, United Kingdom', '20 Oct 2026', '14 leads'],
  ['Breweries', 'Melbourne, Australia', '1 Nov 2026', '9 leads'],
  ['Cafés', 'Lyon, France', '1 Nov 2026', '11 leads'],
];

// The Google Sheet section is real; the others are still on sample data and say so.
export function FindPage() {
  return (
    <>
      <PageHeader title="Find leads" sample={false}>
        Sync the Google Sheet, search Google Maps, or add one business from a link.
      </PageHeader>
      <SheetSyncSection />
      <SectionHeading title="Search Google Maps" sample />
      <NotConnectedForm action="search" className="form">
        <label>
          Business type
          <input name="type" defaultValue="Coffee roasters" />
        </label>
        <label>
          City
          <input name="city" defaultValue="Bristol" />
        </label>
      </NotConnectedForm>
      <SectionHeading title="Recent searches" sample />
      <Table head={['Business type', 'City', 'Date', 'Found']} rows={recentSearches} />
      <SectionHeading title="Add a lead from a link" sample />
      <NotConnectedForm action="addLead" className="form">
        <label>
          Instagram or website link
          <input name="link" placeholder="https://" size={40} />
        </label>
      </NotConnectedForm>
    </>
  );
}
