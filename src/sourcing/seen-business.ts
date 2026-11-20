import { inArray } from 'drizzle-orm';
import type { Executor } from '../platform/db/client.ts';
import { keyedHash } from '../platform/keyed-hash.ts';
import { seenBusiness } from './schema.ts';

/** The match keys of a business, each already normalised; a missing key is null. */
export interface MatchKeys {
  email: string | null;
  websiteDomain: string | null;
  instagramHandle: string | null;
}

/**
 * Whether any match key belonged to a lead that was deleted or erased: such a business was
 * already decided and is not offered again. Compared by keyed hash, never readable.
 */
export async function isAlreadyDecided(
  db: Executor,
  matchHashKey: string,
  keys: MatchKeys,
): Promise<boolean> {
  const hashes = [
    keys.email && keyedHash(matchHashKey, 'email', keys.email),
    keys.websiteDomain && keyedHash(matchHashKey, 'domain', keys.websiteDomain),
    keys.instagramHandle && keyedHash(matchHashKey, 'instagram', keys.instagramHandle),
  ].filter((hash): hash is Buffer => Boolean(hash));
  if (hashes.length === 0) return false;
  const rows = await db
    .select({ hash: seenBusiness.keyHash })
    .from(seenBusiness)
    .where(inArray(seenBusiness.keyHash, hashes))
    .limit(1);
  return rows.length > 0;
}
