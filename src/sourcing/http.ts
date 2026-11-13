import type { FastifyInstance } from 'fastify';
import type { Db } from '../platform/db/client.ts';
import type { Queue } from '../platform/queue.ts';
import { clearSetting, readSetting, writeSetting } from '../platform/settings.ts';
import { enqueueSheetSync } from './jobs.ts';
import { getLead, listLeads } from './leads.ts';
import { failUnqueuedSync, latestSync, startSync } from './sheet-sync.ts';
import { SHEET_LINK_SETTING, spreadsheetIdOf, type SheetLink } from './sheet-link.ts';

// The sourcing module's /api routes: the sheet link, syncs, and the leads, read only.

export interface SourcingRoutesDeps {
  db: Db;
  queue: Queue;
  // Shown on Settings so the owner can share the sheet with it; null when not set up.
  serviceAccountEmail: string | null;
}

export const NOT_A_SHEETS_LINK = 'This is not a Google Sheets link.';

const sheetLinkBody = {
  type: 'object',
  required: ['link'],
  additionalProperties: false,
  properties: { link: { type: ['string', 'null'], maxLength: 2000 } },
} as const;

const leadParams = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', maxLength: 100 } },
} as const;

/** Registers the routes of design D8 on the app. */
export function registerSourcingRoutes(app: FastifyInstance, deps: SourcingRoutesDeps): void {
  const { db } = deps;

  app.get('/api/settings/sheet', async () => {
    const link = await readSetting<SheetLink>(db, SHEET_LINK_SETTING);
    return { link: link?.url ?? null, serviceAccountEmail: deps.serviceAccountEmail };
  });

  // An empty link clears it; anything but a Google Sheets address is refused.
  app.put<{ Body: { link: string | null } }>(
    '/api/settings/sheet',
    { schema: { body: sheetLinkBody } },
    async (request, reply) => {
      const url = request.body.link?.trim() ?? '';
      if (!url) {
        await clearSetting(db, SHEET_LINK_SETTING);
        return { link: null };
      }
      const spreadsheetId = spreadsheetIdOf(url);
      if (!spreadsheetId) return reply.code(400).send({ error: NOT_A_SHEETS_LINK });
      const link: SheetLink = { url, spreadsheetId };
      await writeSetting(db, SHEET_LINK_SETTING, link);
      return { link: url };
    },
  );

  app.post('/api/sheet-syncs', async (_request, reply) => {
    const start = await startSync(db, 'now');
    if (!start.started) return reply.code(409).send({ error: start.reason });
    try {
      await enqueueSheetSync(deps.queue, start.id);
    } catch (error) {
      await failUnqueuedSync(db, start.id);
      throw error;
    }
    return reply.code(202).send({ id: start.id });
  });

  app.get('/api/sheet-syncs/latest', async () => {
    const link = await readSetting<SheetLink>(db, SHEET_LINK_SETTING);
    return { linkSet: link !== null, sync: await latestSync(db) };
  });

  app.get('/api/leads', async () => ({ leads: await listLeads(db) }));

  app.get<{ Params: { id: string } }>(
    '/api/leads/:id',
    { schema: { params: leadParams } },
    async (request, reply) => {
      const found = await getLead(db, request.params.id);
      if (!found) return reply.code(404).send({ error: 'No lead has this id.' });
      return found;
    },
  );
}
