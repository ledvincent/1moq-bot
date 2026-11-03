// Invented sample data (MOQ-30): the Overview figures, from the other sample files.
import { queuedEmails, replies, sending } from './emails.ts';
import { leads } from './leads.ts';

export const overview = {
  waitingForReview: leads.filter((lead) => lead.status === 'waiting for review').length,
  emailsToday: queuedEmails.length,
  newReplies: replies.length,
  sending: sending.state,
};
