// Invented sample data (MOQ-30): fixed figures, nothing is computed.
export const periods = ['This week', 'This month', 'Last 30 days'] as const;

export interface ResultRow {
  group: string;
  found: number;
  approved: number;
  sent: number;
  replies: number;
  replyRate: string;
  optOuts: number;
  bounces: number;
}

export const totals = { found: 148, approved: 61, sent: 54, replies: 7, replyRate: '13%' };

export const byClientType: ResultRow[] = [
  {
    group: 'Cafés and roasters',
    found: 42,
    approved: 20,
    sent: 18,
    replies: 3,
    replyRate: '17%',
    optOuts: 1,
    bounces: 0,
  },
  {
    group: 'Breweries',
    found: 25,
    approved: 11,
    sent: 10,
    replies: 1,
    replyRate: '10%',
    optOuts: 0,
    bounces: 1,
  },
  {
    group: 'Indie clothing brands',
    found: 38,
    approved: 16,
    sent: 14,
    replies: 2,
    replyRate: '14%',
    optOuts: 0,
    bounces: 0,
  },
  {
    group: 'Gyms',
    found: 43,
    approved: 14,
    sent: 12,
    replies: 1,
    replyRate: '8%',
    optOuts: 1,
    bounces: 1,
  },
];

export const byMarket: ResultRow[] = [
  {
    group: 'United Kingdom',
    found: 71,
    approved: 30,
    sent: 27,
    replies: 4,
    replyRate: '15%',
    optOuts: 1,
    bounces: 1,
  },
  {
    group: 'France',
    found: 33,
    approved: 13,
    sent: 11,
    replies: 1,
    replyRate: '9%',
    optOuts: 0,
    bounces: 0,
  },
  {
    group: 'Australia',
    found: 44,
    approved: 18,
    sent: 16,
    replies: 2,
    replyRate: '13%',
    optOuts: 1,
    bounces: 1,
  },
];
