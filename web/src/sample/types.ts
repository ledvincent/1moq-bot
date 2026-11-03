// Types of the sample data shown until each page is connected (MOQ-30 design D5).

export const leadStatuses = [
  'found',
  'waiting for review',
  'approved',
  'rejected',
  'to contact by hand',
  'emailed',
  'replied',
  'opted out',
  'bounced',
  'sequence finished',
] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const clientTypes = [
  'Cafés and roasters',
  'Bars and restaurants',
  'Breweries',
  'Indie clothing brands',
  'Gyms',
  'Yoga and pilates studios',
  'Hotels and resorts',
  'Schools',
  'Run and sports clubs',
  'Events and festivals',
  'Tech startups',
  'Music artists and bands',
  'Associations',
  'Other',
] as const;
export type ClientType = (typeof clientTypes)[number];

export type FitLevel = 'good' | 'possible' | 'poor';
export type RuleResult = 'met' | 'not met' | 'unknown';
export type FactSource =
  'Google Maps' | 'website' | 'Instagram profile' | 'AI profile' | 'set by the owner';
export type Language = 'English' | 'French';

export const steps = ['intro', 'Instagram DM', 'follow-up 1', 'follow-up 2', 'last email'] as const;
export type Step = (typeof steps)[number];

export interface Fact {
  fact: string;
  value: string;
  source: FactSource;
}

export interface HistoryEntry {
  date: string;
  event: string;
}

export interface Lead {
  id: string;
  name: string;
  website: string;
  instagram: string | null;
  email: string | null;
  clientType: ClientType;
  clientTypeReason: string;
  market: string;
  language: Language;
  timeZone: string | null;
  status: LeadStatus;
  statusDate: string;
  fit: FitLevel;
  rules: RuleResult[];
  flags: string[];
  facts: Fact[];
  history: HistoryEntry[];
}

export interface QueuedEmail {
  leadId: string;
  step: Step;
  sendTime: string;
}
