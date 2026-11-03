import { describe, expect, it } from 'vitest';
import { matchRoute, pages } from './routes.ts';

describe('matchRoute', () => {
  it('lists the eight pages in menu order', () => {
    expect(pages.map((page) => page.label)).toEqual([
      'Overview',
      'Find leads',
      'Review',
      'Leads',
      'Emails',
      'Templates',
      'Results',
      'Settings',
    ]);
  });

  it('matches the home page', () => {
    expect(matchRoute('/')).toEqual({ kind: 'page', page: 'overview' });
  });

  it('matches a page address', () => {
    expect(matchRoute('/emails')).toEqual({ kind: 'page', page: 'emails' });
  });

  it('ignores a trailing slash', () => {
    expect(matchRoute('/leads/')).toEqual({ kind: 'page', page: 'leads' });
    expect(matchRoute('/leads/lead-03/')).toEqual({ kind: 'lead', id: 'lead-03' });
  });

  it('matches a lead page with its id', () => {
    expect(matchRoute('/leads/lead-07')).toEqual({ kind: 'lead', id: 'lead-07' });
  });

  it('finds no page for an unknown address', () => {
    expect(matchRoute('/to-do')).toEqual({ kind: 'not-found' });
    expect(matchRoute('/leads/lead-01/history')).toEqual({ kind: 'not-found' });
    expect(matchRoute('/Emails')).toEqual({ kind: 'not-found' });
  });
});
