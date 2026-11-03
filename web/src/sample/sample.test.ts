import { describe, expect, it } from 'vitest';
import { mailbox } from './settings.ts';
import { leads } from './leads.ts';

// The statuses of okf/domain/lead-status.md, written out here on purpose.
const statusesFromOkf = [
  'found',
  'waiting for review',
  'approved',
  'rejected',
  'to contact by hand',
  'emailed',
  'replied',
  'opted out',
  'bounced',
  'sequence finished',
];

describe('sample data', () => {
  it('has every lead status at least once', () => {
    const present = new Set(leads.map((lead) => lead.status));
    for (const status of statusesFromOkf) expect(present, status).toContain(status);
  });

  it('uses only .example websites', () => {
    const websites = leads.flatMap((lead) => [
      lead.website,
      ...lead.facts.filter((fact) => fact.fact === 'Website').map((fact) => fact.value),
    ]);
    for (const website of websites) expect(new URL(website).hostname).toMatch(/\.example$/);
  });

  it('uses only example.com email addresses', () => {
    const addresses = [
      mailbox.address,
      ...leads.flatMap((lead) => (lead.email ? [lead.email] : [])),
      ...leads.flatMap((lead) =>
        lead.facts.filter((fact) => fact.value.includes('@')).map((fact) => fact.value),
      ),
    ];
    expect(addresses.length).toBeGreaterThan(1);
    for (const address of addresses) expect(address).toMatch(/^[^@\s]+@example\.com$/);
  });

  it('gives every lead a unique id, facts with a source and a history', () => {
    expect(new Set(leads.map((lead) => lead.id)).size).toBe(leads.length);
    for (const lead of leads) {
      expect(lead.facts.length, lead.id).toBeGreaterThan(0);
      expect(lead.history.length, lead.id).toBeGreaterThan(0);
      expect(lead.rules, lead.id).toHaveLength(5);
    }
  });
});
