import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMigratedDatabase, type MigratedDatabase } from '../../tests/helpers/migrated-db.ts';
import { TEST_MATCH_HASH_KEY } from '../../tests/helpers/test-config.ts';
import { keyedHash } from '../platform/keyed-hash.ts';
import { isOnDoNotContactList } from './index.ts';
import { doNotContact } from './schema.ts';

describe('do-not-contact list', () => {
  let database: MigratedDatabase;

  beforeAll(async () => {
    database = await createMigratedDatabase();
    await database.db.insert(doNotContact).values({
      addressHash: keyedHash(TEST_MATCH_HASH_KEY, 'email', 'stop@shop.example'),
      reason: 'unsubscribed',
    });
  });

  afterAll(async () => {
    await database.drop();
  });

  it('accepts an insert', async () => {
    await database.db
      .insert(doNotContact)
      .values({ addressHash: keyedHash(TEST_MATCH_HASH_KEY, 'email', 'other@shop.example') });
    const { rows } = await database.pool.query('select count(*)::int as n from do_not_contact');
    expect(rows[0].n).toBe(2);
  });

  it('refuses DELETE', async () => {
    await expect(database.pool.query('delete from do_not_contact')).rejects.toThrow(
      'The do-not-contact list is never deleted from (DELETE)',
    );
  });

  it('refuses TRUNCATE', async () => {
    await expect(database.pool.query('truncate do_not_contact')).rejects.toThrow(
      'The do-not-contact list is never deleted from (TRUNCATE)',
    );
  });

  it('finds a listed address by its keyed hash', async () => {
    expect(await isOnDoNotContactList(database.db, TEST_MATCH_HASH_KEY, 'stop@shop.example')).toBe(
      true,
    );
  });

  it('does not find an address not listed, nor a listed one under another key', async () => {
    expect(await isOnDoNotContactList(database.db, TEST_MATCH_HASH_KEY, 'go@shop.example')).toBe(
      false,
    );
    expect(
      await isOnDoNotContactList(database.db, `${TEST_MATCH_HASH_KEY}-other`, 'stop@shop.example'),
    ).toBe(false);
  });

  it('stores no readable address', async () => {
    const { rows } = await database.pool.query(
      "select count(*)::int as n from do_not_contact where position(convert_to('stop@shop', 'UTF8') in address_hash) > 0",
    );
    expect(rows[0].n).toBe(0);
  });
});
