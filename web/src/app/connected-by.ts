// Actions shown on the pages but not connected yet, and the ticket that connects each
// (MOQ-30 design D6). A feature ticket removes its entry when it wires the action.
export const connectedBy = {
  search: { label: 'Search', ticket: 'MOQ-5', page: '/find' },
  addLead: { label: 'Add lead', ticket: 'MOQ-6', page: '/find' },
  approve: { label: 'Approve', ticket: 'MOQ-13', page: '/review' },
  reject: { label: 'Reject', ticket: 'MOQ-13', page: '/review' },
  changeClientType: { label: 'Change client type', ticket: 'MOQ-11', page: '/leads/lead-01' },
  recordReply: { label: 'Record a reply', ticket: 'MOQ-20', page: '/leads/lead-01' },
  eraseLead: { label: "Erase this lead's data", ticket: 'MOQ-25', page: '/leads/lead-01' },
  pauseSending: { label: 'Pause sending', ticket: 'MOQ-19', page: '/emails' },
  sendNow: { label: 'Send now', ticket: 'MOQ-19', page: '/emails' },
  markDmSent: { label: 'Mark DM as sent', ticket: 'MOQ-22', page: '/emails' },
  saveTemplate: { label: 'Save', ticket: 'MOQ-15', page: '/templates' },
  changePeriod: { label: 'Change the period', ticket: 'MOQ-24', page: '/results' },
  saveLimits: { label: 'Save limits and windows', ticket: 'MOQ-19', page: '/settings' },
  saveMarkets: { label: 'Save active markets', ticket: 'MOQ-12', page: '/settings' },
  checkMailbox: { label: 'Check mailbox', ticket: 'MOQ-17', page: '/settings' },
  addDoNotContact: { label: 'Add to do-not-contact list', ticket: 'MOQ-18', page: '/settings' },
  eraseData: { label: "Erase a lead's data", ticket: 'MOQ-25', page: '/settings' },
  exportData: { label: "Export a lead's data", ticket: 'MOQ-25', page: '/settings' },
} as const;

export type ActionId = keyof typeof connectedBy;

export function notConnectedText(action: ActionId): string {
  const { label, ticket } = connectedBy[action];
  return `Not connected yet. ${label} is connected by ${ticket}.`;
}
