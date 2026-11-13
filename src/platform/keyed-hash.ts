import { createHmac } from 'node:crypto';

/** What a match key is: the kind is part of the hashed input, so equal texts of two kinds differ. */
export type MatchKeyKind = 'email' | 'domain' | 'instagram';

/**
 * The keyed hash (HMAC-SHA256 with MATCH_HASH_KEY) of a match key, as stored in the
 * do-not-contact list and the seen businesses: an address cannot be confirmed by hashing a
 * guess without the server's key (okf/decisions/MOQ-31-lead-tables.md).
 * `value` must already be normalised (for an email, compliance's `normaliseEmail`).
 */
export function keyedHash(key: string, kind: MatchKeyKind, value: string): Buffer {
  return createHmac('sha256', key).update(`${kind}:${value}`, 'utf8').digest();
}
