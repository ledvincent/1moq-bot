import { asc, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../platform/db/client.ts';
import { lead, leadEmail, leadFact, leadSource } from './schema.ts';

// Reading leads for the Leads pages, read only. MOQ-23 (lead list, filters, history) may move
// these to the tracking module.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const summaryColumns = {
  id: lead.id,
  name: lead.name,
  clientType: lead.clientType,
  status: lead.status,
  statusChangedAt: lead.statusChangedAt,
  fitLevel: lead.fitLevel,
  flags: lead.flags,
};

async function sourcesOf(db: Db, leadIds: string[]) {
  if (leadIds.length === 0) return [];
  return db
    .select({
      leadId: leadSource.leadId,
      source: leadSource.source,
      sheetRow: leadSource.sheetRow,
      addedAt: leadSource.addedAt,
    })
    .from(leadSource)
    .where(inArray(leadSource.leadId, leadIds))
    .orderBy(asc(leadSource.addedAt));
}

/** Every lead with its sources, in import order (the sheet's row order), then creation order. */
export async function listLeads(db: Db) {
  const leads = await db
    .select(summaryColumns)
    .from(lead)
    .orderBy(sql`${lead.importPosition} asc nulls last`, asc(lead.createdAt));
  const sources = await sourcesOf(
    db,
    leads.map((row) => row.id),
  );
  return leads.map((row) => ({
    ...row,
    sources: sources.filter((source) => source.leadId === row.id).map((source) => source.source),
  }));
}

/** One lead with its facts, email address and sources; null for an unknown or malformed id. */
export async function getLead(db: Db, id: string) {
  if (!UUID.test(id)) return null;
  const [row] = await db
    .select({ ...summaryColumns, language: lead.language, timeZone: lead.timeZone })
    .from(lead)
    .where(eq(lead.id, id));
  if (!row) return null;
  const [email] = await db
    .select({ address: leadEmail.address })
    .from(leadEmail)
    .where(eq(leadEmail.leadId, id))
    .orderBy(asc(leadEmail.createdAt))
    .limit(1);
  const facts = await db
    .select({ kind: leadFact.kind, value: leadFact.value, source: leadFact.source })
    .from(leadFact)
    .where(eq(leadFact.leadId, id));
  const sources = await sourcesOf(db, [id]);
  return {
    ...row,
    email: email?.address ?? null,
    facts,
    sources: sources.map(({ source, sheetRow, addedAt }) => ({ source, sheetRow, addedAt })),
  };
}
