// Invented sample data (MOQ-30): no real business, person or email address.
// Send times are fixed text in the lead's time zone, not computed.
import type { QueuedEmail, Step } from './types.ts';

export const sending: { state: 'on' | 'paused' } = { state: 'on' };

export const queuedEmails: QueuedEmail[] = [
  { leadId: 'lead-08', step: 'intro', sendTime: 'Wed 4 Nov, 9:14, Europe/London' },
  { leadId: 'lead-01', step: 'follow-up 2', sendTime: 'Wed 4 Nov, 8:12, Europe/London' },
  { leadId: 'lead-05', step: 'intro', sendTime: 'Wed 4 Nov, 8:40, Europe/Amsterdam' },
];

export const sentEmails: { leadId: string; step: Step; sentAt: string }[] = [
  { leadId: 'lead-12', step: 'last email', sentAt: 'Sun 1 Nov' },
  { leadId: 'lead-01', step: 'follow-up 1', sentAt: 'Wed 28 Oct' },
  { leadId: 'lead-07', step: 'intro', sentAt: 'Sat 17 Oct' },
];

export const replies: { leadId: string; receivedAt: string; summary: string }[] = [
  { leadId: 'lead-07', receivedAt: 'Sat 31 Oct', summary: 'Asks for a quote for 100 hoodies' },
];

export const dmsDue: { leadId: string; due: string }[] = [
  { leadId: 'lead-01', due: 'Mon 26 Oct (day 3)' },
];
