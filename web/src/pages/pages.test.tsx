import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { connectedBy, type ActionId } from '../app/connected-by.ts';
import { byText, click, renderAt, spyOnRequests } from '../test/render.tsx';

const addresses = [
  '/',
  '/find',
  '/review',
  '/leads',
  '/emails',
  '/templates',
  '/results',
  '/settings',
  '/leads/lead-01',
];

function text(root: HTMLElement) {
  return root.textContent ?? '';
}

describe('pages', () => {
  it('Every page shows the sample data marker', async () => {
    for (const address of addresses) {
      const root = await renderAt(address);
      const marker = root.querySelector('h1 + [data-sample-marker]');
      expect(marker?.textContent, address).toBe('Sample data');
      expect(root.querySelector('main')!.children.length, address).toBeGreaterThan(1);
    }
  });

  it('Unconnected action changes nothing', async () => {
    const ids = Object.keys(connectedBy) as ActionId[];
    for (const must of ['search', 'approve', 'sendNow', 'saveTemplate', 'saveLimits']) {
      expect(ids).toContain(must);
    }
    for (const id of ids) {
      const { page, label, ticket } = connectedBy[id];
      const requests = spyOnRequests();
      const root = await renderAt(page);
      const button = root.querySelector<HTMLButtonElement>(`button[data-action="${id}"]`);
      expect(button, `${id} on ${page}`).not.toBeNull();
      await click(button!);
      expect(requests.count(), id).toBe(0);
      expect(location.pathname, id).toBe(page);
      expect(root.querySelector('[role="status"]')!.textContent, id).toBe(
        `Not connected yet. ${label} is connected by ${ticket}.`,
      );
    }
  });

  it('Open a lead from the list', async () => {
    const root = await renderAt('/leads');
    await click(byText(root, 'table a', 'Atelier Nord'));
    expect(location.pathname).toBe('/leads/lead-07');
    expect(root.querySelector('h1')!.textContent).toBe('Atelier Nord');
    expect(root.querySelector('[data-lead-status]')!.textContent).toBe('replied');
    const facts = Array.from(root.querySelectorAll('table')[0]!.querySelectorAll('tbody tr')).map(
      (row) => Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent),
    );
    expect(facts).toContainEqual(['Address', 'Brussels, Belgium', 'Google Maps']);
    expect(facts).toContainEqual(['Founder', 'Lucien Mareau', 'AI profile']);
    expect(text(root)).toContain('31 Oct 2026');
    expect(text(root)).toContain('Intro sent');
  });

  it('Leads filters by status', async () => {
    const root = await renderAt('/leads');
    expect(root.querySelectorAll('tbody tr').length).toBe(12);
    const select = root.querySelector('select')!;
    const options = Array.from(select.options).map((option) => option.value);
    expect(options).toContain('to contact by hand');
    await act(async () => {
      select.value = 'waiting for review';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const names = Array.from(root.querySelectorAll('tbody tr a')).map((a) => a.textContent);
    expect(names).toEqual(['Fernleaf Bakehouse', 'Copperline Brewing Co.', 'Studio Lumen Pilates']);
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
