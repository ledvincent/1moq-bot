import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMigratedDatabase, type MigratedDatabase } from '../../tests/helpers/migrated-db.ts';
import { TEST_MATCH_HASH_KEY } from '../../tests/helpers/test-config.ts';
import { keyedHash } from '../platform/keyed-hash.ts';
import { seenBusiness } from './schema.ts';
import { isAlreadyDecided, type MatchKeys } from './seen-business.ts';

const none: MatchKeys = { email: null, websiteDomain: null, instagramHandle: null };

describe('isAlreadyDecided', () => {
  let database: MigratedDatabase;

  beforeAll(async () => {
    database = await createMigratedDatabase();
    await database.db.insert(seenBusiness).values([
      {
        keyHash: keyedHash(TEST_MATCH_HASH_KEY, 'email', 'gone@shop.example'),
        lastDecision: 'rejected',
      },
      {
        keyHash: keyedHash(TEST_MATCH_HASH_KEY, 'domain', 'gone.example'),
        lastDecision: 'rejected',
      },
      { keyHash: keyedHash(TEST_MATCH_HASH_KEY, 'instagram', 'gone.shop'), lastDecision: 'erased' },
    ]);
  });

  afterAll(async () => {
    await database.drop();
  });

  const decided = (keys: Partial<MatchKeys>) =>
    isAlreadyDecided(database.db, TEST_MATCH_HASH_KEY, { ...none, ...keys });

  it('finds a deleted lead by its email, its website domain or its handle', async () => {
    expect(await decided({ email: 'gone@shop.example' })).toBe(true);
    expect(await decided({ websiteDomain: 'gone.example' })).toBe(true);
    expect(await decided({ instagramHandle: 'gone.shop' })).toBe(true);
    expect(await decided({ email: 'new@shop.example', instagramHandle: 'gone.shop' })).toBe(true);
  });

  it('finds nothing for new keys, or no keys at all', async () => {
    expect(await decided({ email: 'new@shop.example', websiteDomain: 'new.example' })).toBe(false);
    expect(await decided({})).toBe(false);
  });

  it('keeps the kinds apart: a domain is not found as a handle', async () => {
    expect(await decided({ instagramHandle: 'gone.example' })).toBe(false);
  });
});
