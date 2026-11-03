import { NotConnectedForm } from '../ui/not-connected-action.tsx';
import { PageHeader } from '../ui/page-header.tsx';
import { Table } from '../ui/table.tsx';

const recentSearches = [
  ['Coffee roasters', 'Brighton, United Kingdom', '20 Oct 2026', '14 leads'],
  ['Breweries', 'Melbourne, Australia', '1 Nov 2026', '9 leads'],
  ['Cafés', 'Lyon, France', '1 Nov 2026', '11 leads'],
];

export function FindPage() {
  return (
    <>
      <PageHeader title="Find leads">
        Search Google Maps, or add one business from a link.
      </PageHeader>
      <h2>Search Google Maps</h2>
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
      <h2>Recent searches</h2>
      <Table head={['Business type', 'City', 'Date', 'Found']} rows={recentSearches} />
      <h2>Add a lead from a link</h2>
      <NotConnectedForm action="addLead" className="form">
        <label>
          Instagram or website link
          <input name="link" placeholder="https://" size={40} />
        </label>
      </NotConnectedForm>
    </>
  );
}
