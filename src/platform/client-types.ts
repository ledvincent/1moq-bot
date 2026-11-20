// The client types of okf/domain/client-types.md, in its order: shared by sourcing now and by
// qualification, writing and sending later.

/** The 13 client types a lead can be, without "Other". */
export const namedClientTypes = [
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
] as const;

/** The type of a lead that fits none of the 13: flagged for the owner. */
export const OTHER_CLIENT_TYPE = 'Other';

/** Every client type, "Other" last. */
export const clientTypes = [...namedClientTypes, OTHER_CLIENT_TYPE] as const;

export type ClientType = (typeof clientTypes)[number];
