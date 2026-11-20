import { ApiError, getJson } from './client.ts';

// The leads, read only (the Leads list and each lead's page).

export interface LeadSummary {
  id: string;
  name: string;
  clientType: string | null;
  status: string;
  statusChangedAt: string;
  fitLevel: string | null;
  flags: string[];
  sources: string[];
}

export interface LeadFact {
  kind: string;
  value: string;
  source: string;
}

export interface LeadSourceEntry {
  source: string;
  sheetRow: number | null;
  addedAt: string;
}

export interface LeadDetails extends Omit<LeadSummary, 'sources'> {
  language: 'en' | 'fr' | null;
  timeZone: string | null;
  email: string | null;
  facts: LeadFact[];
  sources: LeadSourceEntry[];
}

export async function listLeads(): Promise<LeadSummary[]> {
  return (await getJson<{ leads: LeadSummary[] }>('/api/leads')).leads;
}

/** One lead, or null when no lead has this id. */
export async function getLead(id: string): Promise<LeadDetails | null> {
  try {
    return await getJson<LeadDetails>(`/api/leads/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

// The sheet's column names for the facts it gives, in the sheet's order.
const factNames: [string, string][] = [
  ['buyer_type', 'Buyer type'],
  ['language', 'Language'],
  ['city_area', 'City / area'],
  ['why_they_fit', 'Why they fit'],
  ['website_instagram', 'Website / Instagram'],
  ['owner_founder', 'Owner / founder'],
  ['notes', 'Notes'],
];

/** A fact's name as the owner knows it: the sheet's column name, else the kind itself. */
export function factName(kind: string): string {
  return factNames.find(([known]) => known === kind)?.[1] ?? kind;
}

/** Facts in the sheet's column order, unknown kinds last. */
export function orderedFacts(facts: LeadFact[]): LeadFact[] {
  const rank = (kind: string) => {
    const at = factNames.findIndex(([known]) => known === kind);
    return at === -1 ? factNames.length : at;
  };
  return [...facts].sort((a, b) => rank(a.kind) - rank(b.kind));
}

/** A lead's language as the page shows it. */
export function languageName(language: LeadDetails['language']): string {
  if (language === 'en') return 'English';
  if (language === 'fr') return 'French';
  return 'none';
}
