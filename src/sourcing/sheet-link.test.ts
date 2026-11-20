import { describe, expect, it } from 'vitest';
import { spreadsheetIdOf } from './sheet-link.ts';

const ID = '1AbC-def_GHIjkl0123456789';
const sheets = (path: string) => `https://docs.google.com/spreadsheets/d/${path}`;

describe('spreadsheetIdOf', () => {
  it('reads the id of a Google Sheets link, whatever the tab or gid', () => {
    expect(spreadsheetIdOf(sheets(`${ID}/edit`))).toBe(ID);
    expect(spreadsheetIdOf(sheets(`${ID}/edit#gid=123456`))).toBe(ID);
    expect(spreadsheetIdOf(sheets(`${ID}/edit?gid=987#gid=987`))).toBe(ID);
    expect(spreadsheetIdOf(sheets(ID))).toBe(ID);
    expect(spreadsheetIdOf(`  ${sheets(`${ID}/`)}  `)).toBe(ID);
  });

  it.each([
    ['another site', 'https://shop.example/leads'],
    ['plain HTTP', `http://docs.google.com/spreadsheets/d/${ID}/edit`],
    ['a Google Doc', `https://docs.google.com/document/d/${ID}/edit`],
    ['a look-alike host', `https://docs.google.com.shop.example/spreadsheets/d/${ID}`],
    ['no id', 'https://docs.google.com/spreadsheets/d/'],
    ['a short id', sheets('abc/edit')],
    ['a user in the address', `https://me@docs.google.com/spreadsheets/d/${ID}/edit`],
    ['not an address', 'my leads sheet'],
    ['empty text', ''],
  ])('refuses %s', (_, link) => {
    expect(spreadsheetIdOf(link)).toBeNull();
  });
});
