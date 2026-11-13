import { describe, expect, it } from 'vitest';
import { keyedHash } from './keyed-hash.ts';

const KEY = 'test-key-0123456789-0123456789-01';

describe('keyedHash', () => {
  it('is the HMAC-SHA256 of "<kind>:<value>" with the key', () => {
    // Worked out with: printf 'email:hello@cafe.example' | openssl dgst -sha256 -hmac '<KEY>'
    expect(keyedHash(KEY, 'email', 'hello@cafe.example').toString('hex')).toBe(
      'a291f8899c3e5e70785185df6efcd74265429ce1be96fe6b300d8f16ec2d7d4b',
    );
  });

  it('gives the same hash for the same input', () => {
    expect(keyedHash(KEY, 'domain', 'cafe.example')).toEqual(
      keyedHash(KEY, 'domain', 'cafe.example'),
    );
  });

  it('keeps the kinds apart: the same text as an email and as a domain differ', () => {
    expect(keyedHash(KEY, 'domain', 'hello@cafe.example').toString('hex')).toBe(
      'fe3e73d2e6ef76fa2e64a7e746110966a9d421b6b2e427d587bd7a1f2bb8754d',
    );
    expect(keyedHash(KEY, 'instagram', 'cafe')).not.toEqual(keyedHash(KEY, 'domain', 'cafe'));
  });

  it('gives another hash with another key', () => {
    expect(keyedHash(`${KEY}x`, 'email', 'hello@cafe.example')).not.toEqual(
      keyedHash(KEY, 'email', 'hello@cafe.example'),
    );
  });
});
