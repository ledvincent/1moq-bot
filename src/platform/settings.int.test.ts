import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMigratedDatabase, type MigratedDatabase } from '../../tests/helpers/migrated-db.ts';
import { clearSetting, readSetting, writeSetting } from './settings.ts';

describe('owner settings', () => {
  let database: MigratedDatabase;

  beforeAll(async () => {
    database = await createMigratedDatabase();
  });

  afterAll(async () => {
    await database.drop();
  });

  it('reads null for a key never saved', async () => {
    expect(await readSetting(database.db, 'never.saved')).toBeNull();
  });

  it('reads back a saved value', async () => {
    await writeSetting(database.db, 'probe.saved', { url: 'a', n: 1 });
    expect(await readSetting(database.db, 'probe.saved')).toEqual({ url: 'a', n: 1 });
  });

  it('replaces a value saved again under the same key', async () => {
    await writeSetting(database.db, 'probe.replaced', { n: 1 });
    await writeSetting(database.db, 'probe.replaced', { n: 2 });
    expect(await readSetting(database.db, 'probe.replaced')).toEqual({ n: 2 });
  });

  it('clears a saved value, and clearing a missing one does nothing', async () => {
    await writeSetting(database.db, 'probe.cleared', { n: 1 });
    await clearSetting(database.db, 'probe.cleared');
    await clearSetting(database.db, 'probe.cleared');
    expect(await readSetting(database.db, 'probe.cleared')).toBeNull();
  });
});
