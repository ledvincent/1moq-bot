import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { fakeApi, flaggedLeadFixture, leadFixture } from '../test/fake-api.ts';
import { byText, click, renderAt, spyOnRequests } from '../test/render.tsx';

function tableRows(table: Element) {
  return Array.from(table.querySelectorAll('tbody tr')).map((row) =>
    Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent),
  );
}

describe('Leads', () => {
  it('Imported leads on the Leads list', async () => {
    spyOnRequests(fakeApi().handler);
    const root = await renderAt('/leads');

    expect(Array.from(root.querySelectorAll('thead th')).map((cell) => cell.textContent)).toEqual([
      'Name',
      'Client type',
      'Status',
      'Sources',
      'Flags',
      'Market',
      'Fit',
      'Last change',
    ]);
    expect(tableRows(root.querySelector('table')!)).toEqual([
      [
        'Harbour Roasters',
        'Cafés and roasters',
        'waiting for review',
        'Google Sheet',
        '',
        '–',
        '–',
        '13 Nov 2026',
      ],
      [
        'Fernleaf Bakehouse',
        'Other',
        'approved',
        'Google Sheet',
        'type unknown, no language, time zone unclear',
        '–',
        '–',
        '13 Nov 2026',
      ],
    ]);

    // The status filter works on the real list.
    const select = root.querySelector('select')!;
    await act(async () => {
      select.value = 'waiting for review';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(Array.from(root.querySelectorAll('tbody tr a')).map((a) => a.textContent)).toEqual([
      'Harbour Roasters',
    ]);
  });

  it('shows the empty state before any lead', async () => {
    spyOnRequests(fakeApi({ leads: [] }).handler);
    const root = await renderAt('/leads');
    expect(root.querySelector('table')).toBeNull();
    expect(root.querySelector('[data-empty]')!.textContent).toBe(
      'No leads yet. Sync the Google Sheet on Find leads.',
    );
    expect(byText(root, 'main a', 'Find leads').getAttribute('href')).toBe('/find');
  });

  it("Imported lead's own page", async () => {
    spyOnRequests(fakeApi().handler);
    const root = await renderAt('/leads');
    await click(byText(root, 'table a', 'Fernleaf Bakehouse'));

    expect(location.pathname).toBe('/leads/lead-02');
    expect(root.querySelector('h1')!.textContent).toBe('Fernleaf Bakehouse');
    expect(document.title).toBe('Fernleaf Bakehouse · 1moq-bot');
    expect(root.querySelector('[data-lead-status]')!.textContent).toBe('approved');
    expect(root.querySelector('[data-lead-flags]')!.textContent).toBe(
      ' · Flags: type unknown, no language, time zone unclear',
    );
    const facts = Object.fromEntries(
      Array.from(root.querySelectorAll('dl.facts dt')).map((term) => [
        term.textContent,
        term.nextElementSibling!.textContent,
      ]),
    );
    expect(facts).toEqual({
      'Client type': 'Other',
      Language: 'none',
      'Time zone': 'none',
      'Email address': 'fern@fernleaf.example',
      Sources: 'Google Sheet',
    });
    expect(tableRows(root.querySelectorAll('table')[0]!)).toEqual([
      ['Buyer type', 'Bakery', 'Google Sheet'],
    ]);

    // Its actions still say they are not connected yet.
    await click(byText(root, 'button', 'Change client type'));
    expect(root.querySelector('[role="status"]')!.textContent).toBe(
      'Not connected yet. Change client type is connected by MOQ-11.',
    );
  });

  it("shows the row's values with their source, in the sheet's order, and keeps line breaks", async () => {
    spyOnRequests(fakeApi().handler);
    const root = await renderAt('/leads/lead-01');

    const factsTable = root.querySelectorAll('table')[0]!;
    expect(tableRows(factsTable)).toEqual([
      ['Buyer type', 'Cafés and roasters', 'Google Sheet'],
      ['Language', 'English', 'Google Sheet'],
      ['City / area', 'Leeds, UK', 'Google Sheet'],
      ['Notes', 'Line one\nLine two', 'Google Sheet'],
    ]);
    const notes = byText(factsTable, 'td span', 'Line one\nLine two');
    expect(notes.className).toBe('long-text');
    const facts = root.querySelector('dl.facts')!.textContent;
    expect(facts).toContain('English');
    expect(facts).toContain('Europe/London');
    expect(facts).toContain('Hello@Harbour.example');
  });

  it('builds the history from the sources', async () => {
    spyOnRequests(fakeApi().handler);
    const root = await renderAt('/leads/lead-01');
    expect(tableRows(root.querySelectorAll('table')[1]!)).toEqual([
      ['13 Nov 2026', 'Imported from the Google Sheet, row 5'],
    ]);
  });

  it('shows sheet text as text, never as HTML', async () => {
    const lead = leadFixture({
      name: '<b>Bold</b> Shop',
      facts: [{ kind: 'notes', value: '<img src=x onerror=alert(1)>', source: 'Google Sheet' }],
    });
    spyOnRequests(fakeApi({ leads: [lead, flaggedLeadFixture()] }).handler);
    const root = await renderAt('/leads/lead-01');
    expect(root.querySelector('h1')!.textContent).toBe('<b>Bold</b> Shop');
    expect(root.querySelector('main b, main img')).toBeNull();
  });

  it('shows Page not found for an id no lead has', async () => {
    spyOnRequests(fakeApi().handler);
    const root = await renderAt('/leads/lead-99');
    expect(root.querySelector('h1')!.textContent).toBe('Page not found');
  });

  it("shows the server's error, not Page not found, when the lead cannot be loaded", async () => {
    const api = fakeApi();
    spyOnRequests(async (input, init) =>
      String(input) === '/api/leads/lead-01'
        ? ({
            ok: false,
            status: 500,
            json: async () => ({ error: 'The database could not be reached.' }),
          } as Response)
        : api.handler(input, init),
    );
    const root = await renderAt('/leads/lead-01');

    expect(root.querySelector('main [role="alert"]')!.textContent).toBe(
      'The database could not be reached.',
    );
    expect(root.textContent).not.toContain('Page not found');
    expect(document.title).toBe('Lead · 1moq-bot');
    const marked = root.querySelector('nav[aria-label="Menu"] a[aria-current="page"]');
    expect(marked!.textContent).toBe('Leads');
  });
});
