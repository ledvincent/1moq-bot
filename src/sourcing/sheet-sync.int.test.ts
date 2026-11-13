import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createMigratedDatabase, type MigratedDatabase } from '../../tests/helpers/migrated-db.ts';
import { TEST_MATCH_HASH_KEY } from '../../tests/helpers/test-config.ts';
import { doNotContact } from '../compliance/schema.ts';
import { keyedHash } from '../platform/keyed-hash.ts';
import { clearSetting, writeSetting } from '../platform/settings.ts';
import { FakeSheetSource } from './fake-sheet-source.ts';
import { getLead, listLeads } from './leads.ts';
import { lead, leadEmail, leadSource, seenBusiness, sheetSync } from './schema.ts';
import { SHEET_LINK_SETTING } from './sheet-link.ts';
import {
  failInterruptedSyncs,
  latestSync,
  runDailySync,
  runSync,
  startSync,
  type RunOptions,
  type SyncDeps,
} from './sheet-sync.ts';

const SHEET_ID = 'sheet-0123456789';
const SERVICE_ACCOUNT = 'sheet-reader@moq-test.iam.gserviceaccount.com';

const HEADER = [
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

interface Cells {
  business?: string;
  buyerType?: string;
  cityArea?: string;
  language?: string;
  whyTheyFit?: string;
  notes?: string;
  ownerFounder?: string;
  websiteInstagram?: string;
  email?: string;
  emailSent?: string;
  responded?: string;
}

// A valid row by default; each test changes what it is about.
function row(cells: Cells = {}): string[] {
  const values = {
    business: 'Harbour Roasters',
    buyerType: 'Cafés and roasters',
    cityArea: 'Lyon, France',
    language: 'English',
    whyTheyFit: '',
    notes: '',
    ownerFounder: '',
    websiteInstagram: '',
    email: 'hello@harbour.example',
    emailSent: '',
    responded: '',
    ...cells,
  };
  return [
    values.business,
    values.buyerType,
    values.cityArea,
    values.language,
    values.whyTheyFit,
    values.notes,
    values.ownerFounder,
    values.websiteInstagram,
    values.email,
    values.emailSent,
    values.responded,
  ];
}

// Rows numbered from 2, each with its own business, email and no website.
function validRows(count: number, from = 0): string[][] {
  return Array.from({ length: count }, (_, i) =>
    row({ business: `Shop ${from + i}`, email: `shop${from + i}@shops.example` }),
  );
}

describe('sheet sync', () => {
  let database: MigratedDatabase;
  let sheets: FakeSheetSource;
  let deps: SyncDeps;
  const logged: { data: object; message: string }[] = [];

  beforeAll(async () => {
    database = await createMigratedDatabase();
  });

  afterAll(async () => {
    await database.drop();
  });

  beforeEach(async () => {
    // do_not_contact cannot be emptied: each test uses its own addresses there.
    await database.db.execute(sql`truncate lead, sheet_sync, seen_business cascade`);
    await writeSetting(database.db, SHEET_LINK_SETTING, {
      url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`,
      spreadsheetId: SHEET_ID,
    });
    sheets = new FakeSheetSource();
    logged.length = 0;
    deps = {
      db: database.db,
      sheetSource: sheets,
      matchHashKey: TEST_MATCH_HASH_KEY,
      serviceAccountEmail: SERVICE_ACCOUNT,
      log: {
        info: (data, message) => logged.push({ data, message }),
        error: (data, message) => logged.push({ data, message }),
      },
    };
  });

  function setSheet(rows: string[][], header: string[] = HEADER) {
    sheets.setGrid(SHEET_ID, [header, ...rows]);
  }

  async function syncNow(options: RunOptions = {}) {
    const start = await startSync(database.db, 'now');
    if (!start.started) throw new Error(start.reason);
    await runSync(deps, start.id, options);
    return (await latestSync(database.db))!;
  }

  async function leads() {
    return listLeads(database.db);
  }

  async function leadByName(name: string) {
    const found = (await leads()).find((entry) => entry.name === name);
    expect(found, name).toBeDefined();
    return (await getLead(database.db, found!.id))!;
  }

  function fact(details: Awaited<ReturnType<typeof leadByName>>, kind: string) {
    return details.facts.find((entry) => entry.kind === kind)?.value;
  }

  // A lead found by another source, as MOQ-5 will create them.
  async function seedLead(values: {
    name: string;
    status?: 'found' | 'approved' | 'rejected';
    email?: string;
    websiteDomain?: string;
    instagramHandle?: string;
  }) {
    const [created] = await database.db
      .insert(lead)
      .values({
        name: values.name,
        status: values.status ?? 'approved',
        clientType: 'Breweries',
        websiteDomain: values.websiteDomain,
        instagramHandle: values.instagramHandle,
      })
      .returning({ id: lead.id });
    const id = created!.id;
    if (values.email) {
      await database.db.insert(leadEmail).values({
        leadId: id,
        address: values.email,
        addressNormalised: values.email,
        source: 'Google Maps',
      });
    }
    await database.db.insert(leadSource).values({ leadId: id, source: 'Google Maps' });
    return id;
  }

  const lines = (report: Awaited<ReturnType<typeof syncNow>>) =>
    (report.lines ?? []).map((line) => [line.row, ...line.reasons]);

  describe('One lead per business', () => {
    it.each([['  HELLO@Cafe.example '], ['mailto:hello@cafe.example']])(
      'Sheet row with a known email: %j',
      async (email) => {
        const id = await seedLead({ name: 'Cafe Example', email: 'hello@cafe.example' });
        const before = await getLead(database.db, id);
        setSheet([row({ business: 'Another Name', buyerType: 'Gyms', email })]);

        const report = await syncNow();

        const after = (await getLead(database.db, id))!;
        expect(await leads()).toHaveLength(1);
        expect(after.sources.map((source) => source.source)).toEqual([
          'Google Maps',
          'Google Sheet',
        ]);
        expect(after.sources[1]).toMatchObject({ sheetRow: 2 });
        expect({ ...after, sources: undefined }).toEqual({ ...before, sources: undefined });
        expect(after.status).toBe('approved');
        expect(lines(report)).toEqual([[2, 'duplicate']]);
      },
    );

    it('Sheet row with a known website or handle', async () => {
      const byDomain = await seedLead({
        name: 'Domain Shop',
        status: 'rejected',
        websiteDomain: 'domain-shop.example',
      });
      const byHandle = await seedLead({
        name: 'Handle Shop',
        status: 'rejected',
        instagramHandle: 'handle.shop',
      });
      setSheet([
        row({
          email: 'new1@new.example',
          websiteInstagram: 'https://www.Domain-Shop.example/about',
        }),
        row({ email: 'new2@new.example', websiteInstagram: 'instagram.com/Handle.Shop/' }),
      ]);

      const report = await syncNow();

      expect(await leads()).toHaveLength(2);
      for (const id of [byDomain, byHandle]) {
        const after = (await getLead(database.db, id))!;
        expect(after.status).toBe('rejected');
        expect(after.sources.map((source) => source.source)).toContain('Google Sheet');
      }
      expect(lines(report)).toEqual([
        [2, 'duplicate'],
        [3, 'duplicate'],
      ]);
    });

    it('Same email twice in one sheet', async () => {
      setSheet([
        row({ business: 'Row Two', email: 'Twice@Shop.example' }),
        row({ business: 'Row Three', email: 'twice@shop.EXAMPLE' }),
      ]);

      const report = await syncNow();

      expect((await leads()).map((entry) => entry.name)).toEqual(['Row Two']);
      const created = await leadByName('Row Two');
      expect(created.sources).toEqual([expect.objectContaining({ sheetRow: 2 })]);
      expect(report.createdCount).toBe(1);
      expect(lines(report)).toEqual([[3, 'duplicate']]);
    });
  });

  describe('Sync leads from the Google Sheet', () => {
    it('Sync now imports new rows', async () => {
      setSheet([
        row({ business: 'Charlie', email: 'c@c.example' }),
        row({ business: 'Alpha', email: 'a@a.example' }),
        row({ business: 'Bravo', email: 'b@b.example' }),
      ]);

      await syncNow();

      const all = await leads();
      expect(all.map((entry) => entry.name)).toEqual(['Charlie', 'Alpha', 'Bravo']);
      for (const entry of all) {
        expect(entry).toMatchObject({
          status: 'waiting for review',
          fitLevel: null,
          sources: ['Google Sheet'],
        });
      }
      const { rows } = await database.pool.query<{ name: string }>(
        'select name from lead order by import_position',
      );
      expect(rows.map((entry) => entry.name)).toEqual(['Charlie', 'Alpha', 'Bravo']);
    });
  });

  describe('Sheet values kept unchanged', () => {
    it("Imported lead's values: Imported lead keeps the row's values", async () => {
      const cells = {
        business: "  L'Atelier Brûlé & Fils, S.A.R.L. ",
        buyerType: 'CAFÉS and roasters',
        cityArea: 'Saint-Étienne, France',
        language: 'Français',
        whyTheyFit: 'Sells merch!\nTote bags; aprons — 2 shops.',
        notes: 'Called 3×\r\nAsk for "Zoë".',
        ownerFounder: 'Zoë Brûlé-Martin',
        websiteInstagram: 'atelier-brule.example, @Atelier.Brule',
        email: '  Zoe.Brule@Atelier-Brule.example ',
      };
      setSheet([row(cells)]);

      await syncNow();

      const imported = await leadByName(cells.business);
      expect(imported.name).toBe(cells.business);
      expect(fact(imported, 'buyer_type')).toBe(cells.buyerType);
      expect(fact(imported, 'language')).toBe(cells.language);
      expect(fact(imported, 'city_area')).toBe(cells.cityArea);
      expect(fact(imported, 'why_they_fit')).toBe(cells.whyTheyFit);
      expect(fact(imported, 'website_instagram')).toBe(cells.websiteInstagram);
      expect(fact(imported, 'owner_founder')).toBe(cells.ownerFounder);
      expect(fact(imported, 'notes')).toBe(cells.notes);
      expect(imported.email).toBe('Zoe.Brule@Atelier-Brule.example');
      expect(new Set(imported.facts.map((entry) => entry.source))).toEqual(
        new Set(['Google Sheet']),
      );
      expect(imported.sources.map((source) => source.source)).toEqual(['Google Sheet']);
    });

    it('gives no value for an empty cell', async () => {
      setSheet([row({ whyTheyFit: '', notes: '   ' })]);
      await syncNow();
      const imported = await leadByName('Harbour Roasters');
      expect(fact(imported, 'why_they_fit')).toBeUndefined();
      expect(fact(imported, 'notes')).toBeUndefined();
    });

    it('Changed row leaves its lead unchanged', async () => {
      setSheet([row({ notes: 'First notes' })]);
      await syncNow();
      const before = await leadByName('Harbour Roasters');

      setSheet([
        row({ business: 'Renamed', buyerType: 'Gyms', language: 'French', notes: 'Changed' }),
      ]);
      await syncNow();

      expect(await leads()).toHaveLength(1);
      const after = (await getLead(database.db, before.id))!;
      expect(after.name).toBe('Harbour Roasters');
      expect(after.clientType).toBe('Cafés and roasters');
      expect(after.language).toBe('en');
      expect(after.facts).toEqual(before.facts);
    });

    it('Deleted row leaves its lead unchanged', async () => {
      setSheet([row(), row({ business: 'Other', email: 'other@other.example' })]);
      await syncNow();
      const before = await leadByName('Harbour Roasters');

      setSheet([row({ business: 'Other', email: 'other@other.example' })]);
      await syncNow();

      expect(await getLead(database.db, before.id)).toEqual(before);
    });
  });

  describe('Rows without a usable email or business name are skipped', () => {
    it('Row with no email', async () => {
      setSheet([row({ email: '' }), row({ email: '   ' })]);
      const report = await syncNow();
      expect(await leads()).toEqual([]);
      expect(lines(report)).toEqual([
        [2, 'no email'],
        [3, 'no email'],
      ]);
    });

    it('Row with an invalid email', async () => {
      setSheet([
        row({ email: 'hello@' }),
        row({ email: '@shop.example' }),
        row({ email: 'see website' }),
      ]);
      const report = await syncNow();
      expect(await leads()).toEqual([]);
      expect(lines(report)).toEqual([
        [2, 'invalid email'],
        [3, 'invalid email'],
        [4, 'invalid email'],
      ]);
    });

    it('Row with no business name', async () => {
      setSheet([row({ business: '' }), row({ business: '   ', email: 'two@shop.example' })]);
      const report = await syncNow();
      expect(await leads()).toEqual([]);
      expect(lines(report)).toEqual([
        [2, 'no business name'],
        [3, 'no business name'],
      ]);
    });

    it('Several addresses in one cell', async () => {
      setSheet([row({ email: 'contact(at)shop, team@shop.example; sales@shop.example' })]);
      const report = await syncNow();
      const imported = await leadByName('Harbour Roasters');
      expect(imported.email).toBe('team@shop.example');
      expect(report.createdCount).toBe(1);
      expect(lines(report)).toEqual([[2, 'other addresses ignored']]);
    });
  });

  describe('Rows already contacted are skipped', () => {
    it('Row already contacted', async () => {
      const values = ['TRUE', '2026-10-03', 'Yes', 'yes', 'x'];
      setSheet([
        ...values.map((value, i) => row({ email: `sent${i}@shop.example`, emailSent: value })),
        ...values.map((value, i) => row({ email: `replied${i}@shop.example`, responded: value })),
      ]);
      const report = await syncNow();
      expect(await leads()).toEqual([]);
      expect(report.skippedCount).toBe(10);
      expect(new Set(report.lines!.map((line) => line.reasons.join()))).toEqual(
        new Set(['already contacted']),
      );
    });

    it('Row not contacted yet', async () => {
      const values = ['', 'FALSE', 'No', 'no'];
      setSheet(
        values.map((value, i) =>
          row({
            business: `Shop ${i}`,
            email: `new${i}@shop.example`,
            emailSent: value,
            responded: value,
          }),
        ),
      );
      const report = await syncNow();
      expect(await leads()).toHaveLength(4);
      expect(report.skippedCount).toBe(0);
    });
  });

  describe('Rows the tool must not offer again are skipped', () => {
    it('Row on the do-not-contact list', async () => {
      await database.db
        .insert(doNotContact)
        .values({ addressHash: keyedHash(TEST_MATCH_HASH_KEY, 'email', 'stop@shop.example') })
        .onConflictDoNothing();
      setSheet([row({ email: ' STOP@shop.example' })]);
      const report = await syncNow();
      expect(await leads()).toEqual([]);
      expect(lines(report)).toEqual([[2, 'do not contact']]);
    });

    it('Row of a deleted lead', async () => {
      await database.db.insert(seenBusiness).values([
        {
          keyHash: keyedHash(TEST_MATCH_HASH_KEY, 'email', 'gone@shop.example'),
          lastDecision: 'rejected',
        },
        {
          keyHash: keyedHash(TEST_MATCH_HASH_KEY, 'domain', 'erased.example'),
          lastDecision: 'erased',
        },
      ]);
      setSheet([
        row({ email: 'Gone@Shop.example' }),
        row({ email: 'new@erased.example', websiteInstagram: 'erased.example' }),
      ]);
      const report = await syncNow();
      expect(await leads()).toEqual([]);
      expect(lines(report)).toEqual([
        [2, 'already decided'],
        [3, 'already decided'],
      ]);
    });

    it('checks do-not-contact before already decided, and both before duplicate', async () => {
      await seedLead({ name: 'Known', email: 'known@order.example' });
      await database.db
        .insert(doNotContact)
        .values({ addressHash: keyedHash(TEST_MATCH_HASH_KEY, 'email', 'known@order.example') })
        .onConflictDoNothing();
      await database.db
        .insert(seenBusiness)
        .values([
          { keyHash: keyedHash(TEST_MATCH_HASH_KEY, 'email', 'known@order.example') },
          { keyHash: keyedHash(TEST_MATCH_HASH_KEY, 'domain', 'seen.example') },
        ]);
      await seedLead({ name: 'Seen', websiteDomain: 'seen.example' });
      setSheet([
        row({ email: 'known@order.example' }),
        row({ email: 'other@order.example', websiteInstagram: 'seen.example' }),
      ]);
      const report = await syncNow();
      expect(lines(report)).toEqual([
        [2, 'do not contact'],
        [3, 'already decided'],
      ]);
    });

    it('checks the email before the business name and already contacted', async () => {
      setSheet([
        row({ email: '', business: '', emailSent: 'Yes' }),
        row({ business: '', emailSent: 'Yes' }),
      ]);
      const report = await syncNow();
      expect(lines(report)).toEqual([
        [2, 'no email'],
        [3, 'no business name'],
      ]);
    });
  });

  describe('Client type from the Buyer type', () => {
    it('Buyer type matched ignoring case and accents', async () => {
      setSheet([
        row({ business: 'A', email: 'a@a.example', buyerType: 'CAFES AND ROASTERS' }),
        row({ business: 'B', email: 'b@b.example', buyerType: 'cafés and roasters' }),
        row({ business: 'C', email: 'c@c.example', buyerType: 'run and sports CLUBS' }),
      ]);
      await syncNow();
      const all = await leads();
      expect(all.map((entry) => [entry.name, entry.clientType, entry.flags])).toEqual([
        ['A', 'Cafés and roasters', []],
        ['B', 'Cafés and roasters', []],
        ['C', 'Run and sports clubs', []],
      ]);
    });

    it('Unknown or empty buyer type', async () => {
      setSheet([
        row({ business: 'A', email: 'a@a.example', buyerType: 'Café' }),
        row({ business: 'B', email: 'b@b.example', buyerType: 'Bakery' }),
        row({ business: 'C', email: 'c@c.example', buyerType: '' }),
      ]);
      const report = await syncNow();
      for (const entry of await leads()) {
        expect(entry.clientType, entry.name).toBe('Other');
        expect(entry.flags, entry.name).toEqual(['type unknown']);
      }
      expect(lines(report)).toEqual([
        [2, 'type unknown'],
        [3, 'type unknown'],
        [4, 'type unknown'],
      ]);
      expect(report.flaggedCount).toBe(3);
    });
  });

  describe('Language from the sheet', () => {
    it('Accepted language values', async () => {
      const values = [
        'English',
        'EN',
        'Anglais',
        ' english ',
        'French',
        'FR',
        'Français',
        'fr',
        'Francais',
      ];
      setSheet(
        values.map((language, i) =>
          row({ business: `Shop ${i}`, email: `l${i}@shop.example`, language }),
        ),
      );
      await syncNow();
      const languages = await Promise.all(
        (await leads()).map(async (entry) => {
          const details = (await getLead(database.db, entry.id))!;
          return [details.language, details.flags.includes('no language')];
        }),
      );
      expect(languages).toEqual([
        ...Array.from({ length: 4 }, () => ['en', false]),
        ...Array.from({ length: 5 }, () => ['fr', false]),
      ]);
    });

    it('Other language value', async () => {
      setSheet(
        ['', 'Spanish', 'English/French'].map((language, i) =>
          row({ business: `Shop ${i}`, email: `o${i}@shop.example`, language }),
        ),
      );
      const report = await syncNow();
      for (const entry of await leads()) {
        const details = (await getLead(database.db, entry.id))!;
        expect(details.language, entry.name).toBeNull();
        expect(details.flags, entry.name).toEqual(['no language']);
      }
      expect(lines(report)).toEqual([
        [2, 'no language'],
        [3, 'no language'],
        [4, 'no language'],
      ]);
    });

    it('Empty language never filled later', async () => {
      setSheet([row({ language: '', cityArea: 'Lyon, France' })]);
      await syncNow();
      await syncNow();
      const imported = await leadByName('Harbour Roasters');
      expect(imported.language).toBeNull();
      expect(imported.flags).toEqual(['no language']);
    });
  });

  describe('Time zone from City / area', () => {
    async function zones(cities: string[]) {
      setSheet(
        cities.map((cityArea, i) =>
          row({ business: `Shop ${i}`, email: `z${i}@shop.example`, cityArea }),
        ),
      );
      const report = await syncNow();
      const found = await Promise.all(
        (await leads()).map(async (entry) => {
          const details = (await getLead(database.db, entry.id))!;
          return [details.timeZone, details.flags];
        }),
      );
      return { found, report };
    }

    it('City placed in one time zone', async () => {
      const { found } = await zones(['Lyon, France', 'Leeds, UK']);
      expect(found).toEqual([
        ['Europe/Paris', []],
        ['Europe/London', []],
      ]);
    });

    it('Bare city name with a much larger namesake', async () => {
      const { found } = await zones(['Paris', 'London']);
      expect(found).toEqual([
        ['Europe/Paris', []],
        ['Europe/London', []],
      ]);
    });

    it('City that cannot be placed', async () => {
      const { found, report } = await zones(['Qwertyville Nowhere', '']);
      expect(found).toEqual([
        [null, ['no time zone']],
        [null, ['no time zone']],
      ]);
      expect(lines(report)).toEqual([
        [2, 'no time zone'],
        [3, 'no time zone'],
      ]);
    });

    it('City in several time zones', async () => {
      const { found } = await zones(['Springfield', 'USA']);
      expect(found).toEqual([
        [null, ['time zone unclear']],
        [null, ['time zone unclear']],
      ]);
    });
  });

  describe('Sync report', () => {
    const reportSheet = () => [
      row({ business: 'Two', email: 'two@shop.example' }),
      row({ business: 'Three', email: '' }),
      row({ business: 'Four', email: 'four@shop.example', emailSent: 'Yes' }),
      row({ business: 'Five', email: 'five@shop.example', buyerType: 'Surf shop' }),
      row({ business: 'Six', email: 'six@shop.example' }),
    ];

    it('Report counts and lists rows', async () => {
      setSheet(reportSheet());
      const report = await syncNow();
      expect(report).toMatchObject({
        status: 'done',
        trigger: 'now',
        createdCount: 3,
        flaggedCount: 1,
        skippedCount: 2,
        failure: null,
      });
      expect(report.lines).toEqual([
        { row: 3, outcome: 'skipped', reasons: ['no email'] },
        { row: 4, outcome: 'skipped', reasons: ['already contacted'] },
        { row: 5, outcome: 'created', reasons: ['type unknown'] },
      ]);
      expect(report.startedAt).toBeInstanceOf(Date);
      expect(report.finishedAt).toBeInstanceOf(Date);
      expect(JSON.stringify(report)).not.toContain('@');
    });

    it('Header-only sheet', async () => {
      setSheet([]);
      const report = await syncNow();
      expect(report).toMatchObject({
        status: 'done',
        createdCount: 0,
        flaggedCount: 0,
        skippedCount: 0,
        lines: [],
        failure: null,
      });
    });

    it('Daily sync imports like Sync now', async () => {
      setSheet(reportSheet());
      const now = await syncNow();
      const nowLeads = (await leads()).map(({ name, clientType, status, flags, sources }) => ({
        name,
        clientType,
        status,
        flags,
        sources,
      }));
      await database.db.execute(sql`truncate lead, sheet_sync cascade`);

      await runDailySync(deps);

      const daily = (await latestSync(database.db))!;
      expect(daily.trigger).toBe('daily');
      expect(daily).toMatchObject({
        status: 'done',
        createdCount: now.createdCount,
        flaggedCount: now.flaggedCount,
        skippedCount: now.skippedCount,
        lines: now.lines,
      });
      expect(
        (await leads()).map(({ name, clientType, status, flags, sources }) => ({
          name,
          clientType,
          status,
          flags,
          sources,
        })),
      ).toEqual(nowLeads);
    });
  });

  describe('Sheet layout', () => {
    it.each([['Email'], ['Business'], ['Buyer type']])(
      'Needed column missing: %s',
      async (column) => {
        setSheet(
          [row()],
          HEADER.map((name) => (name === column ? 'Something else' : name)),
        );
        const report = await syncNow();
        expect(await leads()).toEqual([]);
        expect(report.status).toBe('failed');
        expect(report.failure).toBe(`The sheet has no "${column}" column`);
        expect(report.finishedAt).toBeInstanceOf(Date);
      },
    );

    it('Columns in another order', async () => {
      const cells = {
        business: 'Harbour Roasters',
        buyerType: 'Breweries',
        cityArea: 'Leeds, UK',
        language: 'EN',
        notes: 'A note',
        email: 'Hello@Harbour.example',
        websiteInstagram: '@harbour',
      };
      setSheet([row(cells)]);
      await syncNow();
      const usual = await leadByName('Harbour Roasters');
      await database.db.execute(sql`truncate lead, sheet_sync cascade`);

      sheets.setGrid(SHEET_ID, [
        [
          'Notes',
          'EMAIL',
          'website / instagram',
          'BUYER TYPE',
          'language',
          '  business ',
          'City  /  area',
        ],
        [
          cells.notes,
          cells.email,
          cells.websiteInstagram,
          cells.buyerType,
          cells.language,
          cells.business,
          cells.cityArea,
        ],
      ]);
      await syncNow();
      const reordered = await leadByName('Harbour Roasters');

      const comparable = (details: typeof usual) => ({
        ...details,
        id: undefined,
        statusChangedAt: undefined,
        sources: details.sources.map((source) => source.source),
        facts: [...details.facts].sort((a, b) => a.kind.localeCompare(b.kind)),
      });
      expect(comparable(reordered)).toEqual(comparable(usual));
    });

    it('Sheet over 2,000 rows', async () => {
      setSheet(validRows(2001));
      const report = await syncNow();
      expect(await leads()).toEqual([]);
      expect(report.status).toBe('failed');
      expect(report.failure).toBe('The sheet has more than 2,000 rows');
    });

    it('imports a sheet of exactly 2,000 rows', async () => {
      setSheet(validRows(2000));
      const report = await syncNow();
      expect(report.createdCount).toBe(2000);
    });
  });

  describe('A failed sync keeps nothing', () => {
    async function existingLeadSnapshot() {
      const id = await seedLead({
        name: 'Existing',
        email: 'existing@shop.example',
        status: 'approved',
      });
      return { id, before: await getLead(database.db, id) };
    }

    it('Sheet not shared with the tool', async () => {
      const { id, before } = await existingLeadSnapshot();
      setSheet(validRows(2));
      sheets.failure = 'not-shared';
      const report = await syncNow();
      expect(await leads()).toHaveLength(1);
      expect(await getLead(database.db, id)).toEqual(before);
      expect(report).toMatchObject({
        status: 'failed',
        trigger: 'now',
        failure: `The sheet is not shared with the tool. Share it with ${SERVICE_ACCOUNT} as Viewer.`,
      });
      expect(report.finishedAt).toBeInstanceOf(Date);
    });

    it('Sheet link to no sheet', async () => {
      await writeSetting(database.db, SHEET_LINK_SETTING, {
        url: 'https://docs.google.com/spreadsheets/d/no-such-sheet-0000/edit',
        spreadsheetId: 'no-such-sheet-0000',
      });
      const report = await syncNow();
      expect(await leads()).toEqual([]);
      expect(report.status).toBe('failed');
      expect(report.failure).toBe('The sheet cannot be found. Check the link on Settings.');
      expect(report.finishedAt).toBeInstanceOf(Date);
    });

    it('Google unavailable', async () => {
      const { id, before } = await existingLeadSnapshot();
      setSheet(validRows(2));
      sheets.failure = 'unavailable';
      const report = await syncNow();
      expect(await leads()).toHaveLength(1);
      expect(await getLead(database.db, id)).toEqual(before);
      expect(report.status).toBe('failed');
      expect(report.failure).toBe('Google could not be reached. Try again later.');
      expect(report.finishedAt).toBeInstanceOf(Date);
    });

    it.each([
      [
        'access-refused',
        "Google refused the tool's access key. The service account key needs checking.",
      ],
      ['not-set-up', "The tool's Google access is not set up."],
    ] as const)('shows the reason of a %s failure', async (kind, reason) => {
      setSheet(validRows(1));
      sheets.failure = kind;
      expect((await syncNow()).failure).toBe(reason);
    });

    it('Sync fails before the end', async () => {
      const { id, before } = await existingLeadSnapshot();
      setSheet([
        ...validRows(2),
        row({ business: 'Duplicate of existing', email: 'existing@shop.example' }),
        ...validRows(2, 10),
      ]);
      const report = await syncNow({
        afterRow: (rowNumber) => {
          if (rowNumber === 5) throw new Error('Cut after row 5: Shop 10, shop10@shops.example');
        },
      });

      expect((await leads()).map((entry) => entry.name)).toEqual(['Existing']);
      expect(await getLead(database.db, id)).toEqual(before);
      expect(report.status).toBe('failed');
      expect(report.failure).toBe('The sync stopped before the end. Nothing was imported.');
      expect(report.finishedAt).toBeInstanceOf(Date);
      // The log names the failure's kind, never a cell value.
      const failed = logged.find((entry) => entry.message === 'Sheet sync failed')!;
      expect(failed.data).toMatchObject({ trigger: 'now', failure: 'error' });
      expect(JSON.stringify(logged)).not.toMatch(/shop10|Shop 10|@/);
    });

    it('fails a sync whose sheet link was cleared after it started, reading nothing', async () => {
      setSheet(validRows(2));
      const start = await startSync(database.db, 'now');
      if (!start.started) throw new Error(start.reason);
      await clearSetting(database.db, SHEET_LINK_SETTING);
      await runSync(deps, start.id);

      const report = (await latestSync(database.db))!;
      expect(report).toMatchObject({ status: 'failed', failure: 'No sheet link is set.' });
      expect(report.finishedAt).toBeInstanceOf(Date);
      expect(await leads()).toEqual([]);
      expect(sheets.calls).toEqual([]);
      const failed = logged.find((entry) => entry.message === 'Sheet sync failed')!;
      expect(failed.data).toMatchObject({ trigger: 'now', failure: 'no-link' });
    });

    it('Daily sync failure shown', async () => {
      setSheet(validRows(1));
      sheets.failure = 'not-shared';
      await runDailySync(deps);
      const report = (await latestSync(database.db))!;
      expect(report).toMatchObject({
        trigger: 'daily',
        status: 'failed',
        failure: `The sheet is not shared with the tool. Share it with ${SERVICE_ACCOUNT} as Viewer.`,
      });
      expect(report.finishedAt).toBeInstanceOf(Date);
      expect(await leads()).toEqual([]);
    });
  });

  describe('Daily sync', () => {
    it('No daily sync without a sheet link', async () => {
      await clearSetting(database.db, SHEET_LINK_SETTING);
      setSheet(validRows(2));
      await runDailySync(deps);
      expect(await latestSync(database.db)).toBeNull();
      expect(await leads()).toEqual([]);
      expect(sheets.calls).toEqual([]);
    });
  });

  describe('One sync at a time', () => {
    it('Daily sync while one runs', async () => {
      setSheet(validRows(3));
      const start = await startSync(database.db, 'now');
      if (!start.started) throw new Error(start.reason);
      // The daily sync starts while Sync now reads the sheet.
      sheets.beforeAnswer = async () => {
        sheets.beforeAnswer = null;
        await runDailySync(deps);
      };
      await runSync(deps, start.id);

      const syncs = await database.db.select().from(sheetSync);
      expect(syncs.map((sync) => [sync.trigger, sync.status])).toEqual([['now', 'done']]);
      expect(await leads()).toHaveLength(3);
      expect(sheets.calls).toHaveLength(1);
    });

    it('refuses a second start while one runs, and starts again once it ended', async () => {
      const first = await startSync(database.db, 'now');
      expect(first.started).toBe(true);
      expect(await startSync(database.db, 'now')).toEqual({
        started: false,
        reason: 'A sync is already running',
      });
      expect(await startSync(database.db, 'daily')).toEqual({
        started: false,
        reason: 'A sync is already running',
      });
      setSheet([]);
      await runSync(deps, (first as { id: string }).id);
      expect((await startSync(database.db, 'now')).started).toBe(true);
    });

    it('refuses to start without a sheet link', async () => {
      await clearSetting(database.db, SHEET_LINK_SETTING);
      expect(await startSync(database.db, 'now')).toEqual({
        started: false,
        reason: 'No sheet link is set',
      });
    });
  });

  describe('restart', () => {
    it('marks a sync cut by a restart failed, and its job then does nothing', async () => {
      setSheet(validRows(2));
      const start = await startSync(database.db, 'now');
      if (!start.started) throw new Error(start.reason);

      expect(await failInterruptedSyncs(database.db)).toBe(1);
      await runSync(deps, start.id);

      const report = (await latestSync(database.db))!;
      expect(report).toMatchObject({
        status: 'failed',
        failure: 'The tool restarted during the sync. Nothing was imported.',
      });
      expect(report.finishedAt).toBeInstanceOf(Date);
      expect(await leads()).toEqual([]);
      expect(sheets.calls).toEqual([]);
      expect((await startSync(database.db, 'now')).started).toBe(true);
    });
  });

  it('counts a flagged lead once whatever its number of flags', async () => {
    setSheet([row({ buyerType: '', language: '', cityArea: '' })]);
    const report = await syncNow();
    expect(report).toMatchObject({ createdCount: 1, flaggedCount: 1 });
    expect(lines(report)).toEqual([[2, 'type unknown', 'no language', 'no time zone']]);
    const [only] = await database.db.select().from(lead).where(eq(lead.name, 'Harbour Roasters'));
    expect(only!.flags).toEqual(['type unknown', 'no language', 'no time zone']);
  });
});
