import { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { connectedBy, type ActionId } from '../app/connected-by.ts';
import { fakeApi, leadFixture } from '../test/fake-api.ts';
import { byText, click, renderAt, spyOnRequests } from '../test/render.tsx';

// Pages wholly on sample data, and pages mixing real sections with sample ones.
const samplePages = ['/', '/review', '/emails', '/templates', '/results'];
const sampleSections = {
  '/find': ['Search Google Maps', 'Recent searches', 'Add a lead from a link'],
  '/settings': [
    'Daily limits',
    'Send windows',
    'Active markets',
    'Mailbox',
    'Do-not-contact list',
    'Personal data requests',
  ],
};

function text(root: HTMLElement) {
  return root.textContent ?? '';
}

// The pages that read the API get the fake one's answers.
beforeEach(() => {
  spyOnRequests(fakeApi().handler);
});

describe('pages', () => {
  it('Every page shows the sample data marker', async () => {
    for (const address of samplePages) {
      const root = await renderAt(address);
      const marker = root.querySelector('h1 + [data-sample-marker]');
      expect(marker?.textContent, address).toBe('Sample data');
      expect(root.querySelector('main')!.children.length, address).toBeGreaterThan(1);
    }
    for (const [address, sections] of Object.entries(sampleSections)) {
      const root = await renderAt(address);
      expect(root.querySelector('h1 + [data-sample-marker]'), address).toBeNull();
      const marked = Array.from(root.querySelectorAll('h2 + [data-sample-marker]')).map(
        (marker) => marker.previousElementSibling!.textContent,
      );
      expect(marked, address).toEqual(sections);
      const sheet = root.querySelector('section[data-section="google-sheet"]');
      expect(sheet?.querySelector('h2')?.textContent, address).toBe('Google Sheet');
      expect(sheet!.querySelector('[data-sample-marker]'), address).toBeNull();
    }
  });

  it('Connected pages show no marker', async () => {
    let root = await renderAt('/leads');
    expect(byText(root, 'tbody a', 'Harbour Roasters')).toBeDefined();
    expect(root.querySelector('[data-sample-marker]')).toBeNull();

    root = await renderAt('/leads/lead-01');
    expect(root.querySelector('h1')!.textContent).toBe('Harbour Roasters');
    expect(root.querySelector('[data-sample-marker]')).toBeNull();
  });

  it('Unconnected action changes nothing', async () => {
    const ids = Object.keys(connectedBy) as ActionId[];
    for (const must of ['search', 'approve', 'sendNow', 'saveTemplate', 'saveLimits']) {
      expect(ids).toContain(must);
    }
    for (const id of ids) {
      const { page, label, ticket } = connectedBy[id];
      const requests = spyOnRequests(fakeApi().handler);
      const root = await renderAt(page);
      const button = root.querySelector<HTMLButtonElement>(`button[data-action="${id}"]`);
      expect(button, `${id} on ${page}`).not.toBeNull();
      // The page's own load is not the action's: count only what the action asks.
      const before = requests.count();
      await click(button!);
      expect(requests.count(), id).toBe(before);
      expect(location.pathname, id).toBe(page);
      expect(root.querySelector('[role="status"]')!.textContent, id).toBe(
        `Not connected yet. ${label} is connected by ${ticket}.`,
      );
    }
  });

  it('Open a lead from the list', async () => {
    const root = await renderAt('/leads');
    await click(byText(root, 'table a', 'Harbour Roasters'));
    expect(location.pathname).toBe(`/leads/${leadFixture().id}`);
    expect(root.querySelector('h1')!.textContent).toBe('Harbour Roasters');
    expect(root.querySelector('[data-lead-status]')!.textContent).toBe('waiting for review');
    const facts = Array.from(root.querySelectorAll('table')[0]!.querySelectorAll('tbody tr')).map(
      (row) => Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent),
    );
    expect(facts).toContainEqual(['City / area', 'Leeds, UK', 'Google Sheet']);
    expect(facts).toContainEqual(['Buyer type', 'Cafés and roasters', 'Google Sheet']);
    expect(text(root)).toContain('13 Nov 2026');
    expect(text(root)).toContain('Imported from the Google Sheet, row 5');
  });

  it('Leads filters by status', async () => {
    const root = await renderAt('/leads');
    expect(root.querySelectorAll('tbody tr').length).toBe(2);
    const select = root.querySelector('select')!;
    const options = Array.from(select.options).map((option) => option.value);
    expect(options).toContain('to contact by hand');
    await act(async () => {
      select.value = 'approved';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const names = Array.from(root.querySelectorAll('tbody tr a')).map((a) => a.textContent);
    expect(names).toEqual(['Fernleaf Bakehouse']);
  });

  it('Overview figures link to their pages', async () => {
    const root = await renderAt('/');
    const links = Array.from(root.querySelectorAll('main .stats a')).map((a) => [
      a.querySelector('.stat-label')!.textContent,
      a.getAttribute('href'),
    ]);
    expect(links).toEqual([
      ['Leads waiting for review', '/review'],
      ['Emails going out today', '/emails'],
      ['New replies', '/emails'],
      ['Sending', '/emails'],
    ]);
    expect(root.querySelector('.stat-value')!.textContent).toBe('3');
  });

  it('Review moves through the waiting leads locally', async () => {
    const root = await renderAt('/review');
    expect(text(root)).toContain('1 of 3');
    expect(root.querySelector('h2')!.textContent).toBe('Fernleaf Bakehouse');
    await click(byText(root, 'button', 'Next lead'));
    expect(text(root)).toContain('2 of 3');
    expect(root.querySelector('h2')!.textContent).toBe('Copperline Brewing Co.');
    await click(byText(root, 'button', 'Previous lead'));
    expect(root.querySelector('h2')!.textContent).toBe('Fernleaf Bakehouse');
  });

  it('Emails shows queued send times in the lead time zone', async () => {
    const root = await renderAt('/emails');
    expect(text(root)).toContain('Wed 4 Nov, 8:12, Europe/London');
    expect(text(root)).toContain('To contact by hand');
    expect(text(root)).toContain('Kestrel Run Club');
  });

  it('Settings shows the default send windows', async () => {
    const root = await renderAt('/settings');
    const rows = Array.from(root.querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td'))
        .slice(0, 2)
        .map((cell) => cell.textContent),
    );
    expect(rows).toContainEqual(['Breweries', '8:00 to 9:00']);
    expect(rows).toContainEqual(['Gyms', '9:00 to 10:00']);
    expect(rows).toContainEqual(['Associations', '9:00 to 10:00']);
    expect(
      root.querySelector<HTMLInputElement>('input[aria-label="Saturday for Breweries"]')!.checked,
    ).toBe(true);
    expect(
      root.querySelector<HTMLInputElement>('input[aria-label="Saturday for Gyms"]')!.checked,
    ).toBe(false);
  });

  it('Templates offers every step and both languages', async () => {
    const root = await renderAt('/templates');
    const options = (name: string) =>
      Array.from(root.querySelector<HTMLSelectElement>(`select[name="${name}"]`)!.options).map(
        (option) => option.textContent,
      );
    expect(options('step')).toEqual([
      'intro',
      'Instagram DM',
      'follow-up 1',
      'follow-up 2',
      'last email',
    ]);
    expect(options('language')).toEqual(['English', 'French']);
  });
});
