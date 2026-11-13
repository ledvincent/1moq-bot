import { describe, expect, it } from 'vitest';
import { readSheetRows, SheetLayoutError } from './sheet-rows.ts';

const header = [
  'Business',
  'Buyer type',
  'City / area',
  'Language',
  'Why they fit',
  'Notes',
  'Owner / founder (public)',
  'Website / Instagram',
  'Email',
  'Email sent',
  'Responded',
];

function layoutError(values: string[][]): string {
  try {
    readSheetRows(values);
  } catch (error) {
    expect(error).toBeInstanceOf(SheetLayoutError);
    return (error as Error).message;
  }
  return expect.fail('expected a SheetLayoutError');
}

describe('readSheetRows', () => {
  it('reads each column by its header, the first data row being row 2', () => {
    const rows = readSheetRows([
      header,
      ['Cafe A', 'Breweries', 'Lyon', 'FR', 'Why', 'Note', 'Ann', '@a', 'a@a.example', '', 'No'],
    ]);
    expect(rows).toEqual([
      {
        rowNumber: 2,
        business: 'Cafe A',
        buyerType: 'Breweries',
        cityArea: 'Lyon',
        language: 'FR',
        whyTheyFit: 'Why',
        notes: 'Note',
        ownerFounder: 'Ann',
        websiteInstagram: '@a',
        email: 'a@a.example',
        emailSent: '',
        responded: 'No',
      },
    ]);
  });

  it('matches headers ignoring case and extra spaces, in any order', () => {
    const rows = readSheetRows([
      ['  EMAIL ', 'buyer   TYPE', '  business '],
      ['a@a.example', 'Gyms', 'Gym A'],
    ]);
    expect(rows[0]).toMatchObject({ business: 'Gym A', buyerType: 'Gyms', email: 'a@a.example' });
  });

  it('accepts "Owner / founder" for "Owner / founder (public)"', () => {
    const rows = readSheetRows([
      ['Business', 'Buyer type', 'Email', 'Owner / founder'],
      ['A', 'Gyms', 'a@a.example', 'Ann Example'],
    ]);
    expect(rows[0]!.ownerFounder).toBe('Ann Example');
  });

  it('takes the first of two columns of one name', () => {
    const rows = readSheetRows([
      ['Business', 'Buyer type', 'Email', 'Email'],
      ['A', 'Gyms', 'first@a.example', 'second@a.example'],
    ]);
    expect(rows[0]!.email).toBe('first@a.example');
  });

  it('reads a missing optional column, and a short row, as empty cells', () => {
    const rows = readSheetRows([['Business', 'Buyer type', 'Email', 'Notes'], ['A']]);
    expect(rows[0]).toMatchObject({ business: 'A', email: '', notes: '', cityArea: '' });
  });

  it('ignores another column', () => {
    const rows = readSheetRows([
      ['Business', 'Template slide', 'Buyer type', 'Email'],
      ['A', 'slide 3', 'Gyms', 'a@a.example'],
    ]);
    expect(Object.values(rows[0]!)).not.toContain('slide 3');
  });

  it('leaves out empty rows and keeps the row numbers of the others', () => {
    const rows = readSheetRows([
      ['Business', 'Buyer type', 'Email'],
      ['A', 'Gyms', 'a@a.example'],
      [],
      ['  ', '', ' '],
      ['B', 'Gyms', 'b@b.example'],
    ]);
    expect(rows.map((row) => [row.rowNumber, row.business])).toEqual([
      [2, 'A'],
      [5, 'B'],
    ]);
  });

  it('gives no rows for a header-only sheet', () => {
    expect(readSheetRows([header])).toEqual([]);
  });

  it('names a missing needed column', () => {
    expect(layoutError([['Business', 'Buyer type', 'Notes']])).toBe(
      'The sheet has no "Email" column',
    );
  });

  it('names every missing needed column', () => {
    expect(layoutError([['Notes']])).toBe(
      'The sheet has no "Business" column, no "Buyer type" column and no "Email" column',
    );
    expect(layoutError([])).toBe(
      'The sheet has no "Business" column, no "Buyer type" column and no "Email" column',
    );
    expect(layoutError([['Buyer type']])).toBe(
      'The sheet has no "Business" column and no "Email" column',
    );
  });

  it('reads exactly 2,000 rows below the header', () => {
    const values = [header, ...Array.from({ length: 2000 }, (_, i) => [`B${i}`])];
    expect(readSheetRows(values)).toHaveLength(2000);
  });

  it('refuses 2,001 rows below the header', () => {
    const values = [header, ...Array.from({ length: 2001 }, (_, i) => [`B${i}`])];
    expect(layoutError(values)).toBe('The sheet has more than 2,000 rows');
  });
});
