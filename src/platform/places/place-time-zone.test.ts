import { describe, expect, it } from 'vitest';
import { foldPlaceName, parsePlaceFiles, placeTimeZone } from './place-time-zone.ts';

const zone = (name: string) => ({ kind: 'zone', zone: name });
const unclear = { kind: 'unclear' };
const none = { kind: 'none' };

describe('placeTimeZone on the shipped place list', () => {
  it.each([
    ['Lyon, France', 'Europe/Paris'],
    ['Leeds, UK', 'Europe/London'],
    ['Brooklyn, NY', 'America/New_York'],
    ['Saint-Étienne, France', 'Europe/Paris'],
  ])('places "%s" in %s through its city and country', (text, expected) => {
    expect(placeTimeZone(text)).toEqual(zone(expected));
  });

  it('places a town not in the list through its country when the country has one zone', () => {
    expect(placeTimeZone('Smalltown, France')).toEqual(zone('Europe/Paris'));
  });

  it('places a country alone when it has one zone', () => {
    expect(placeTimeZone('France')).toEqual(zone('Europe/Paris'));
    expect(placeTimeZone('Royaume-Uni')).toEqual(zone('Europe/London'));
  });

  it('gives a bare city name the zone of a namesake at least 10 times larger', () => {
    // Paris, Texas: about 25,000 people; London, Ontario: about 400,000.
    expect(placeTimeZone('Paris')).toEqual(zone('Europe/Paris'));
    expect(placeTimeZone('London')).toEqual(zone('Europe/London'));
  });

  it('leaves a bare city name unclear when a namesake in another zone is within a factor of 10', () => {
    expect(placeTimeZone('Manchester')).toEqual(unclear);
    expect(placeTimeZone('Springfield')).toEqual(unclear);
  });

  it('leaves a country in several zones unclear, alone or after a city it does not hold', () => {
    expect(placeTimeZone('USA')).toEqual(unclear);
    expect(placeTimeZone('Smalltown, USA')).toEqual(unclear);
  });

  it('places nothing for an invented place or empty text', () => {
    expect(placeTimeZone('Qwertyville Nowhere')).toEqual(none);
    expect(placeTimeZone('')).toEqual(none);
    expect(placeTimeZone('   ')).toEqual(none);
    expect(placeTimeZone(' , ')).toEqual(none);
  });

  it('ignores case, accents, dots and extra spaces', () => {
    expect(placeTimeZone('  LYON ,   frAnce ')).toEqual(zone('Europe/Paris'));
    expect(placeTimeZone('Zurich')).toEqual(zone('Europe/Zurich'));
    expect(placeTimeZone('ZÜRICH')).toEqual(zone('Europe/Zurich'));
    expect(placeTimeZone('Leeds, U.K.')).toEqual(zone('Europe/London'));
  });
});

describe('placeTimeZone tie-break', () => {
  const countries = ['AA\tAAA\tAland\tEurope/Paris', 'BB\tBBB\tBland\tAmerica/Chicago'].join('\n');
  const places = (big: number, small: number, sameZoneRival = 0) =>
    parsePlaceFiles(
      [
        '# test list',
        `Townsville\t\tAA\tEurope/Paris\t${big}`,
        `Townsville\t\tBB\tAmerica/Chicago\t${small}`,
        ...(sameZoneRival ? [`Townsville\t\tAA\tEurope/Paris\t${sameZoneRival}`] : []),
      ].join('\n'),
      countries,
    );

  it('takes the larger namesake at exactly 10 times the people', () => {
    expect(placeTimeZone('Townsville', places(100_000, 10_000))).toEqual(zone('Europe/Paris'));
  });

  it('stays unclear just under 10 times', () => {
    expect(placeTimeZone('Townsville', places(99_999, 10_000))).toEqual(unclear);
  });

  it('does not count a namesake in the same zone against the largest', () => {
    expect(placeTimeZone('Townsville', places(100_000, 10_000, 90_000))).toEqual(
      zone('Europe/Paris'),
    );
  });

  it('never tie-breaks when a country is named', () => {
    const list = parsePlaceFiles(
      'Twin\t\tCC\tAmerica/New_York\t1000000\nTwin\t\tCC\tAmerica/Chicago\t1000',
      'CC\tCCC\tCland\tAmerica/New_York,America/Chicago',
    );
    expect(placeTimeZone('Twin', list)).toEqual(zone('America/New_York'));
    expect(placeTimeZone('Twin, Cland', list)).toEqual(unclear);
  });

  it('drops zones Luxon does not know', () => {
    const list = parsePlaceFiles(
      'Oldtown\t\tAA\tMars/Olympus\t500000\nOldtown\t\tAA\tEurope/Paris\t20000',
      'AA\tAAA\tAland\tMars/Olympus,Europe/Paris',
    );
    expect(placeTimeZone('Oldtown', list)).toEqual(zone('Europe/Paris'));
    expect(placeTimeZone('Aland', list)).toEqual(zone('Europe/Paris'));
  });
});

describe('foldPlaceName', () => {
  it('trims, lower-cases, drops accents and dots and collapses spaces', () => {
    expect(foldPlaceName('  Saint-Étienne   du  Rouvray. ')).toBe('saint-etienne du rouvray');
  });
});
