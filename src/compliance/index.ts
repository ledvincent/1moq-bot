import { eq } from 'drizzle-orm';
import type { Executor } from '../platform/db/client.ts';
import { keyedHash } from '../platform/keyed-hash.ts';
import { doNotContact } from './schema.ts';

// The compliance module's public interface: the do-not-contact rules other modules use.

/**
 * The one normalisation of an email address, for matching leads and for the do-not-contact list:
 * surrounding spaces and a leading "mailto:" (any case) dropped, the whole address lower-cased.
 */
export function normaliseEmail(address: string): string {
  return address
    .trim()
    .replace(/^mailto:/i, '')
    .trim()
    .toLowerCase();
}

/**
 * Whether a normalised address (see normaliseEmail) is on the do-not-contact list, compared by its
 * keyed hash: the list holds no readable address.
 */
export async function isOnDoNotContactList(
  db: Executor,
  matchHashKey: string,
  normalisedAddress: string,
): Promise<boolean> {
  const rows = await db
    .select({ hash: doNotContact.addressHash })
    .from(doNotContact)
    .where(eq(doNotContact.addressHash, keyedHash(matchHashKey, 'email', normalisedAddress)))
    .limit(1);
  return rows.length > 0;
}
