import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMigratedDatabase, type MigratedDatabase } from '../../tests/helpers/migrated-db.ts';
import { lead, leadEmail, leadFact, leadSource, sheetSync } from './schema.ts';

describe('lead tables', () => {
  let database: MigratedDatabase;

  beforeAll(async () => {
    database = await createMigratedDatabase();
  });

  afterAll(async () => {
    await database.drop();
  });

  async function newLead(values: Partial<typeof lead.$inferInsert> = {}) {
    const [row] = await database.db
      .insert(lead)
      .values({ name: 'Probe', status: 'waiting for review', ...values })
      .returning({ id: lead.id });
    return row!.id;
  }

  // The PostgreSQL error code of a refused statement.
  async function refusal(statement: Promise<unknown>): Promise<string | undefined> {
    try {
      await statement;
    } catch (error) {
      const cause = (error as { cause?: { code?: string } }).cause;
      return cause?.code ?? (error as { code?: string }).code;
    }
    return undefined;
  }

  it('refuses a second running sheet sync, and allows one again once it ended', async () => {
    const [first] = await database.db
      .insert(sheetSync)
      .values({ trigger: 'now', status: 'running' })
      .returning({ id: sheetSync.id });
    expect(
      await refusal(database.db.insert(sheetSync).values({ trigger: 'daily', status: 'running' })),
    ).toBe('23505');
    await database.db.update(sheetSync).set({ status: 'done' }).where(eq(sheetSync.id, first!.id));
    await database.db.insert(sheetSync).values({ trigger: 'daily', status: 'running' });
    await database.db.update(sheetSync).set({ status: 'failed' });
  });

  it('refuses two leads with the same normalised email address', async () => {
    const a = await newLead();
    const b = await newLead();
    await database.db.insert(leadEmail).values({
      leadId: a,
      address: 'Hello@Cafe.example',
      addressNormalised: 'hello@cafe.example',
      source: 'Google Sheet',
    });
    expect(
      await refusal(
        database.db.insert(leadEmail).values({
          leadId: b,
          address: 'hello@cafe.example',
          addressNormalised: 'hello@cafe.example',
          source: 'Google Sheet',
        }),
      ),
    ).toBe('23505');
  });

  it('refuses two leads with the same website domain or Instagram handle', async () => {
    await newLead({ websiteDomain: 'cafe.example', instagramHandle: 'cafe' });
    expect(await refusal(newLead({ websiteDomain: 'cafe.example' }))).toBe('23505');
    expect(await refusal(newLead({ instagramHandle: 'cafe' }))).toBe('23505');
  });

  it('allows many leads with no website domain or handle', async () => {
    await newLead();
    await newLead();
  });

  it('refuses a status that is not a lead status', async () => {
    expect(await refusal(newLead({ status: 'maybe' as never }))).toBe('23514');
  });

  it('deleting a lead removes its emails, facts and sources', async () => {
    const id = await newLead();
    await database.db.insert(leadEmail).values({
      leadId: id,
      address: 'gone@shop.example',
      addressNormalised: 'gone@shop.example',
      source: 'Google Sheet',
    });
    await database.db
      .insert(leadFact)
      .values({ leadId: id, kind: 'notes', value: 'x', source: 'Google Sheet' });
    await database.db
      .insert(leadSource)
      .values({ leadId: id, source: 'Google Sheet', sheetRow: 2 });

    await database.db.delete(lead).where(eq(lead.id, id));

    expect(await database.db.select().from(leadEmail).where(eq(leadEmail.leadId, id))).toEqual([]);
    expect(await database.db.select().from(leadFact).where(eq(leadFact.leadId, id))).toEqual([]);
    expect(await database.db.select().from(leadSource).where(eq(leadSource.leadId, id))).toEqual(
      [],
    );
  });
});
