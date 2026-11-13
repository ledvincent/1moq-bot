import { normaliseEmail } from '../compliance/index.ts';
import { namedClientTypes, OTHER_CLIENT_TYPE, type ClientType } from '../platform/client-types.ts';
import { placeTimeZone } from '../platform/places/place-time-zone.ts';
import { isNotWebsiteHost } from './not-website-domains.ts';
import type { LeadFlag } from './schema.ts';
import type { SheetColumn, SheetRow } from './sheet-rows.ts';

// The rules a sheet row goes through before the database is asked anything: pure functions
// (openspec/specs/lead-sourcing/spec.md, from "Rows without a usable email or business name are
// skipped" to "Time zone from City / area").

/** The note added when an Email cell holds more than the address kept. */
export const OTHER_ADDRESSES_IGNORED = 'other addresses ignored';

/** Folds a text for comparison: accents removed, lower-case, trimmed, single spaces. */
export function foldText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const LOCAL_PART = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]{1,64}$/;
const DOMAIN_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;

/** Whether a text is one valid email address (design D5's rule, not the whole RFC). */
export function isValidEmail(text: string): boolean {
  if (text.length > 254) return false;
  const parts = text.split('@');
  if (parts.length !== 2) return false;
  const [local = '', domain = ''] = parts;
  if (!LOCAL_PART.test(local) || local.startsWith('.') || local.endsWith('.')) return false;
  if (local.includes('..')) return false;
  const labels = domain.split('.');
  if (labels.length < 2 || !labels.every((label) => DOMAIN_LABEL.test(label))) return false;
  return /^[A-Za-z]{2,}$/.test(labels.at(-1)!);
}

/** What an Email cell holds. */
export type EmailCell =
  | { kind: 'none' }
  | { kind: 'invalid' }
  // `address` as written, without surrounding spaces and "mailto:"; `othersIgnored` when the
  // cell held anything else.
  | { kind: 'valid'; address: string; othersIgnored: boolean };

/**
 * Reads an Email cell: split on commas, semicolons, slashes and spaces, each piece without a
 * leading "mailto:"; the first valid piece is kept.
 */
export function readEmailCell(cell: string): EmailCell {
  const pieces = cell
    .split(/[,;/\s]+/)
    .map((piece) => piece.replace(/^mailto:/i, ''))
    .filter((piece) => piece);
  if (pieces.length === 0) return { kind: 'none' };
  const address = pieces.find(isValidEmail);
  if (!address) return { kind: 'invalid' };
  return { kind: 'valid', address, othersIgnored: pieces.length > 1 };
}

/**
 * Whether a row was already contacted: "Email sent" or "Responded" holds anything but empty,
 * unticked (FALSE) or "No", ignoring case and surrounding spaces.
 */
export function isAlreadyContacted(emailSent: string, responded: string): boolean {
  const contacted = (cell: string) => !['', 'false', 'no'].includes(cell.trim().toLowerCase());
  return contacted(emailSent) || contacted(responded);
}

/**
 * The client type named by a Buyer type, ignoring case, accents and extra spaces; anything else,
 * empty or "Other" included, is "Other" and unknown.
 */
export function matchClientType(buyerType: string): { clientType: ClientType; unknown: boolean } {
  const key = foldText(buyerType);
  const found = namedClientTypes.find((name) => foldText(name) === key);
  return found
    ? { clientType: found, unknown: false }
    : { clientType: OTHER_CLIENT_TYPE, unknown: true };
}

const languages: Record<string, 'en' | 'fr'> = {
  english: 'en',
  en: 'en',
  anglais: 'en',
  french: 'fr',
  fr: 'fr',
  francais: 'fr',
};

/** English or French from the Language cell, ignoring case, spaces and accents; else none. */
export function matchLanguage(cell: string): 'en' | 'fr' | null {
  return languages[foldText(cell)] ?? null;
}

const HANDLE = /^[a-z0-9._]{1,30}$/;
const notProfilePaths = new Set(['p', 'reel', 'reels', 'explore', 'stories']);

function handleOf(text: string): string | null {
  const handle = text.toLowerCase();
  return HANDLE.test(handle) ? handle : null;
}

function urlOf(piece: string): URL | null {
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(piece) ? piece : `https://${piece}`);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

const isHostName = (host: string) => {
  const labels = host.split('.');
  return (
    labels.length >= 2 &&
    labels.every((label) => DOMAIN_LABEL.test(label)) &&
    /^[a-z]{2,}$/.test(labels.at(-1)!)
  );
};

/**
 * The website domain and the Instagram handle a Website / Instagram cell names: each piece (split
 * on spaces and commas) is an @handle, an instagram.com profile link, or a website, whose host
 * (lower-cased, without "www.") is the domain unless it is a social or link-in-bio host. The first
 * of each kind counts.
 */
export function readWebsiteInstagram(cell: string): {
  websiteDomain: string | null;
  instagramHandle: string | null;
} {
  let websiteDomain: string | null = null;
  let instagramHandle: string | null = null;
  for (const piece of cell.split(/[\s,]+/).filter((text) => text)) {
    if (piece.startsWith('@')) {
      instagramHandle ??= handleOf(piece.slice(1));
      continue;
    }
    // An email address is not a website.
    if (piece.includes('@')) continue;
    const url = urlOf(piece);
    if (!url) continue;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
      const first = url.pathname.split('/').find((part) => part) ?? '';
      if (!notProfilePaths.has(first.toLowerCase())) instagramHandle ??= handleOf(first);
      continue;
    }
    if (isNotWebsiteHost(host) || !isHostName(host)) continue;
    websiteDomain ??= host;
  }
  return { websiteDomain, instagramHandle };
}

/** Why a row is skipped before the database is asked. */
export type RowSkipReason = 'no email' | 'invalid email' | 'no business name' | 'already contacted';

/** A row that passed the checks on its own: what its lead would be. */
export interface LeadCandidate {
  rowNumber: number;
  // Business, exactly as read.
  name: string;
  email: { address: string; normalised: string };
  websiteDomain: string | null;
  instagramHandle: string | null;
  clientType: ClientType;
  language: 'en' | 'fr' | null;
  timeZone: string | null;
  flags: LeadFlag[];
  notes: string[];
  // The sheet's values kept as facts, exactly as read; an empty cell gives none.
  facts: { kind: string; value: string }[];
}

// The fact kind of each column kept as a fact (Business is the name, Email its own table).
const factKinds: [SheetColumn, string][] = [
  ['buyerType', 'buyer_type'],
  ['language', 'language'],
  ['cityArea', 'city_area'],
  ['whyTheyFit', 'why_they_fit'],
  ['websiteInstagram', 'website_instagram'],
  ['ownerFounder', 'owner_founder'],
  ['notes', 'notes'],
];

/**
 * The checks of a row that need no database, in order (the first that applies decides): email,
 * business name, already contacted. A row that passes them gives its lead candidate, with its
 * client type, language and time zone, and the flags and notes for the report.
 */
export function assessRow(row: SheetRow): { skip: RowSkipReason } | { candidate: LeadCandidate } {
  const email = readEmailCell(row.email);
  if (email.kind === 'none') return { skip: 'no email' };
  if (email.kind === 'invalid') return { skip: 'invalid email' };
  if (!row.business.trim()) return { skip: 'no business name' };
  if (isAlreadyContacted(row.emailSent, row.responded)) return { skip: 'already contacted' };

  const flags: LeadFlag[] = [];
  const type = matchClientType(row.buyerType);
  if (type.unknown) flags.push('type unknown');
  const language = matchLanguage(row.language);
  if (!language) flags.push('no language');
  const place = placeTimeZone(row.cityArea);
  if (place.kind === 'none') flags.push('no time zone');
  if (place.kind === 'unclear') flags.push('time zone unclear');

  return {
    candidate: {
      rowNumber: row.rowNumber,
      name: row.business,
      email: { address: email.address, normalised: normaliseEmail(email.address) },
      ...readWebsiteInstagram(row.websiteInstagram),
      clientType: type.clientType,
      language,
      timeZone: place.kind === 'zone' ? place.zone : null,
      flags,
      notes: email.othersIgnored ? [OTHER_ADDRESSES_IGNORED] : [],
      facts: factKinds
        .filter(([column]) => row[column].trim())
        .map(([column, kind]) => ({ kind, value: row[column] })),
    },
  };
}
