import { describe, expect, it } from 'vitest';
import {
  assessRow,
  isAlreadyContacted,
  isValidEmail,
  matchClientType,
  matchLanguage,
  readEmailCell,
  readWebsiteInstagram,
} from './row-rules.ts';
import type { SheetRow } from './sheet-rows.ts';

describe('isValidEmail', () => {
  it.each([
    'hello@shop.example',
    "o'neil+news@mail.shop.co.uk",
    'a@b.cd',
    'x-1@sub-domain.example',
  ])('accepts %s', (address) => expect(isValidEmail(address)).toBe(true));

  it.each([
    ['no @', 'hello.shop.example'],
    ['two @', 'a@b@shop.example'],
    ['empty local part', '@shop.example'],
    ['empty domain', 'hello@'],
    ['one domain label', 'hello@localhost'],
    ['leading dot', '.hello@shop.example'],
    ['trailing dot', 'hello.@shop.example'],
    ['double dot', 'hel..lo@shop.example'],
    ['a label starting with a hyphen', 'hello@-shop.example'],
    ['a label ending with a hyphen', 'hello@shop-.example'],
    ['a one-letter last label', 'hello@shop.e'],
    ['digits in the last label', 'hello@shop.c0m'],
    ['a character outside the list', 'hel(lo)@shop.example'],
    ['a local part over 64 characters', `${'a'.repeat(65)}@shop.example`],
    ['over 254 characters', `a@${'b'.repeat(250)}.example`],
  ])('refuses %s', (_, address) => expect(isValidEmail(address)).toBe(false));

  it('accepts a local part of exactly 64 characters', () => {
    expect(isValidEmail(`${'a'.repeat(64)}@shop.example`)).toBe(true);
  });
});

describe('readEmailCell', () => {
  it('reads one address, without surrounding spaces, keeping its case', () => {
    expect(readEmailCell('  HELLO@Cafe.example ')).toEqual({
      kind: 'valid',
      address: 'HELLO@Cafe.example',
      othersIgnored: false,
    });
  });

  it('drops a leading mailto: in any case', () => {
    expect(readEmailCell('MailTo:hello@cafe.example')).toEqual({
      kind: 'valid',
      address: 'hello@cafe.example',
      othersIgnored: false,
    });
  });

  it('is "none" for an empty cell, spaces only, or only separators', () => {
    expect(readEmailCell('')).toEqual({ kind: 'none' });
    expect(readEmailCell('   ')).toEqual({ kind: 'none' });
    expect(readEmailCell(' , ; / ')).toEqual({ kind: 'none' });
    expect(readEmailCell('mailto:')).toEqual({ kind: 'none' });
  });

  it.each(['hello@', '@shop.example', 'see website', 'contact(at)shop'])(
    'is "invalid" for %s',
    (cell) => expect(readEmailCell(cell)).toEqual({ kind: 'invalid' }),
  );

  it('keeps the first valid address and notes the others, valid or not', () => {
    expect(readEmailCell('contact(at)shop, team@shop.example; sales@shop.example')).toEqual({
      kind: 'valid',
      address: 'team@shop.example',
      othersIgnored: true,
    });
    expect(readEmailCell('a@shop.example / b@shop.example')).toMatchObject({
      address: 'a@shop.example',
      othersIgnored: true,
    });
    expect(readEmailCell('a@shop.example see-website')).toMatchObject({ othersIgnored: true });
  });
});

describe('isAlreadyContacted', () => {
  it.each([
    ['empty', ''],
    ['unticked', 'FALSE'],
    ['false in another case', 'false'],
    ['No', 'No'],
    ['no with spaces', '  no '],
  ])('is false for %s in both cells', (_, value) => {
    expect(isAlreadyContacted(value, value)).toBe(false);
  });

  it.each([
    ['ticked', 'TRUE'],
    ['a date', '2026-10-03'],
    ['Yes', 'Yes'],
    ['yes', 'yes'],
    ['x', 'x'],
    ['a note', 'by phone'],
  ])('is true for %s in either cell', (_, value) => {
    expect(isAlreadyContacted(value, '')).toBe(true);
    expect(isAlreadyContacted('', value)).toBe(true);
  });
});

describe('matchClientType', () => {
  it('matches a client type ignoring case, accents and extra spaces', () => {
    expect(matchClientType('CAFES AND ROASTERS')).toEqual({
      clientType: 'Cafés and roasters',
      unknown: false,
    });
    expect(matchClientType('  run   and sports CLUBS ')).toEqual({
      clientType: 'Run and sports clubs',
      unknown: false,
    });
  });

  it.each(['Café', 'Bakery', '', 'Other', 'other'])('gives Other, unknown, for "%s"', (value) => {
    expect(matchClientType(value)).toEqual({ clientType: 'Other', unknown: true });
  });
});

describe('matchLanguage', () => {
  it.each(['English', 'EN', 'Anglais', ' english '])('reads %s as English', (value) => {
    expect(matchLanguage(value)).toBe('en');
  });

  it.each(['French', 'FR', 'Français', 'fr', 'Francais', 'FRANÇAIS'])(
    'reads %s as French',
    (value) => expect(matchLanguage(value)).toBe('fr'),
  );

  it.each(['', 'Spanish', 'English/French', 'E N'])('reads "%s" as no language', (value) => {
    expect(matchLanguage(value)).toBeNull();
  });
});

describe('readWebsiteInstagram', () => {
  const read = readWebsiteInstagram;

  it('reads an @handle, lower-cased', () => {
    expect(read('@Harbour.Roasters')).toEqual({
      websiteDomain: null,
      instagramHandle: 'harbour.roasters',
    });
  });

  it('reads a website host, lower-cased, without www.', () => {
    expect(read('https://WWW.Harbour-Roasters.example/shop?x=1')).toEqual({
      websiteDomain: 'harbour-roasters.example',
      instagramHandle: null,
    });
    expect(read('harbour.example')).toMatchObject({ websiteDomain: 'harbour.example' });
  });

  it('reads the handle of an instagram.com profile link', () => {
    expect(read('https://www.instagram.com/harbour_roasters/')).toEqual({
      websiteDomain: null,
      instagramHandle: 'harbour_roasters',
    });
    expect(read('instagram.com/Harbour')).toMatchObject({ instagramHandle: 'harbour' });
  });

  it.each(['p/Cx1abc', 'reel/Cx1abc', 'reels/x', 'explore/tags', 'stories/harbour'])(
    'reads no handle from instagram.com/%s',
    (path) => {
      expect(read(`https://instagram.com/${path}`)).toEqual({
        websiteDomain: null,
        instagramHandle: null,
      });
    },
  );

  it.each([
    'https://linktr.ee/harbour',
    'https://www.facebook.com/harbour',
    'https://m.facebook.com/harbour',
    'https://beacons.ai/harbour',
    'https://maps.google.com/?q=harbour',
    'https://goo.gl/maps/abc',
    'https://x.com/harbour',
  ])('reads no website from %s', (cell) => {
    expect(read(cell).websiteDomain).toBeNull();
  });

  it('reads a website and a handle from one cell, split on spaces and commas', () => {
    expect(read('harbour.example, @harbour')).toEqual({
      websiteDomain: 'harbour.example',
      instagramHandle: 'harbour',
    });
    expect(read('Site: harbour.example IG: instagram.com/harbour')).toEqual({
      websiteDomain: 'harbour.example',
      instagramHandle: 'harbour',
    });
  });

  it('keeps the first website and the first handle', () => {
    expect(read('one.example two.example @first @second')).toEqual({
      websiteDomain: 'one.example',
      instagramHandle: 'first',
    });
  });

  it('reads no handle longer than 30 characters or with other characters', () => {
    expect(read(`@${'a'.repeat(31)}`).instagramHandle).toBeNull();
    expect(read('@har-bour').instagramHandle).toBeNull();
    expect(read(`@${'a'.repeat(30)}`).instagramHandle).toBe('a'.repeat(30));
  });

  it('reads nothing from an email address, a word or an empty cell', () => {
    for (const cell of ['hello@harbour.example', 'website', '', 'ftp://files.example']) {
      expect(read(cell), cell).toEqual({ websiteDomain: null, instagramHandle: null });
    }
  });
});

describe('assessRow', () => {
  const row = (cells: Partial<SheetRow>): SheetRow => ({
    rowNumber: 2,
    business: 'Harbour Roasters',
    buyerType: 'Cafés and roasters',
    cityArea: 'Lyon, France',
    language: 'French',
    whyTheyFit: '',
    notes: '',
    ownerFounder: '',
    websiteInstagram: '',
    email: 'hello@harbour.example',
    emailSent: '',
    responded: '',
    ...cells,
  });

  it('skips in order: the email first, then the business name, then already contacted', () => {
    expect(assessRow(row({ email: '', business: '', emailSent: 'x' }))).toEqual({
      skip: 'no email',
    });
    expect(assessRow(row({ email: 'x@', business: '', emailSent: 'x' }))).toEqual({
      skip: 'invalid email',
    });
    expect(assessRow(row({ business: '   ', emailSent: 'x' }))).toEqual({
      skip: 'no business name',
    });
    expect(assessRow(row({ responded: 'Yes' }))).toEqual({ skip: 'already contacted' });
  });

  it('gives the lead candidate of a valid row with no flag', () => {
    expect(
      assessRow(
        row({
          email: ' Hello@Harbour.example',
          websiteInstagram: 'harbour.example @harbour',
          notes: 'Line 1\nLine 2',
          whyTheyFit: '  ',
        }),
      ),
    ).toEqual({
      candidate: {
        rowNumber: 2,
        name: 'Harbour Roasters',
        email: { address: 'Hello@Harbour.example', normalised: 'hello@harbour.example' },
        websiteDomain: 'harbour.example',
        instagramHandle: 'harbour',
        clientType: 'Cafés and roasters',
        language: 'fr',
        timeZone: 'Europe/Paris',
        flags: [],
        notes: [],
        facts: [
          { kind: 'buyer_type', value: 'Cafés and roasters' },
          { kind: 'language', value: 'French' },
          { kind: 'city_area', value: 'Lyon, France' },
          { kind: 'website_instagram', value: 'harbour.example @harbour' },
          { kind: 'notes', value: 'Line 1\nLine 2' },
        ],
      },
    });
  });

  it('flags an unknown type, no language and no time zone, and notes other addresses', () => {
    const result = assessRow(
      row({ buyerType: 'Bakery', language: '', cityArea: '', email: 'a@b.example, c@d.example' }),
    );
    expect(result).toMatchObject({
      candidate: {
        clientType: 'Other',
        language: null,
        timeZone: null,
        flags: ['type unknown', 'no language', 'no time zone'],
        notes: ['other addresses ignored'],
      },
    });
  });

  it('flags a time zone that is unclear', () => {
    expect(assessRow(row({ cityArea: 'Springfield' }))).toMatchObject({
      candidate: { timeZone: null, flags: ['time zone unclear'] },
    });
  });
});
