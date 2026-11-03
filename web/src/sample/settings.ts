// Invented sample data (MOQ-30): the defaults of okf/domain/, nothing is saved.
import { clientTypes, type ClientType } from './types.ts';

export const dailyLimits = { newIntros: 25, total: 50 };

const early: ClientType[] = ['Cafés and roasters', 'Bars and restaurants', 'Breweries'];

export const sendWindows = clientTypes
  .filter((type) => type !== 'Other')
  .map((type) =>
    early.includes(type)
      ? { clientType: type, window: '8:00 to 9:00', saturday: true }
      : { clientType: type, window: '9:00 to 10:00', saturday: false },
  );

export const markets = [
  { name: 'EU countries', active: true },
  { name: 'United Kingdom', active: true },
  { name: 'Australia', active: true },
  { name: 'Singapore', active: false },
  { name: 'United States', active: false },
];

export const mailbox = {
  address: 'hello@example.com',
  status: 'Connected, last checked 3 Nov, 7:58',
};

export const doNotContactCount = 4;
