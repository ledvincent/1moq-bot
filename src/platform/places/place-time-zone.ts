import { readFileSync } from 'node:fs';
import { Info } from 'luxon';

// A free-text place ("Lyon, France", "France", "London") to an IANA time zone, through the
// offline GeoNames list in ./data (okf/decisions/MOQ-31-offline-place-lookup.md). An unknown or
// ambiguous place is never guessed: the caller flags it.

/** A zone found, or why there is none. */
export type PlaceZone = { kind: 'zone'; zone: string } | { kind: 'unclear' } | { kind: 'none' };

interface City {
  country: string;
  zone: string;
  population: number;
}

/** The place list, indexed by folded name. */
export interface PlaceIndex {
  citiesByName: Map<string, City[]>;
  zonesByCountry: Map<string, string[]>;
  // Folded country names, ISO and ISO3 codes and aliases, to the ISO code.
  countryByName: Map<string, string>;
}

// A bare city name takes its most populous namesake's zone only when that one has at least
// this many times the people of every namesake in another zone (chosen by the owner, 2026-11-13).
const TIE_BREAK_FACTOR = 10;

// Common names the GeoNames country list does not hold: English short names and the French names
// of the market countries, as the owner may write them.
const countryAliases: Record<string, string[]> = {
  GB: [
    'UK',
    'Great Britain',
    'Britain',
    'England',
    'Scotland',
    'Wales',
    'Northern Ireland',
    'Angleterre',
    'Royaume-Uni',
    'Royaume Uni',
    'Grande-Bretagne',
    'Écosse',
    'Pays de Galles',
    'Irlande du Nord',
  ],
  US: ['USA', 'America', 'United States of America', 'États-Unis', 'Etats Unis'],
  DE: ['Allemagne'],
  BE: ['Belgique'],
  CH: ['Suisse'],
  AU: ['Australie'],
  ES: ['Espagne'],
  IT: ['Italie'],
  NL: ['Pays-Bas', 'Holland', 'The Netherlands'],
  IE: ['Irlande'],
  AT: ['Autriche'],
  SG: ['Singapour'],
  DK: ['Danemark'],
  SE: ['Suède'],
  PL: ['Pologne'],
  GR: ['Grèce'],
};

/** Folds a place name for comparison: trimmed, lower-case, without accents or dots, single spaces. */
export function foldPlaceName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Lines of a data file, without its attribution comment and blank lines, split on tabs.
function lines(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => line.split('\t'));
}

/**
 * Builds the index from the two files `scripts/build-places.mjs` writes. Zones Luxon does not
 * know are dropped, so every zone returned can be used for scheduling.
 */
export function parsePlaceFiles(citiesTsv: string, countriesTsv: string): PlaceIndex {
  // Checking a zone with Luxon is slow and 34,000 cities share about 400 zones: check each once.
  const known = new Map<string, boolean>();
  const isKnownZone = (zone: string) => {
    let valid = known.get(zone);
    if (valid === undefined) {
      valid = Info.isValidIANAZone(zone);
      known.set(zone, valid);
    }
    return valid;
  };

  const citiesByName = new Map<string, City[]>();
  for (const [name = '', ascii = '', country = '', zone = '', population = '0'] of lines(
    citiesTsv,
  )) {
    if (!isKnownZone(zone)) continue;
    const city = { country, zone, population: Number(population) };
    for (const key of new Set([foldPlaceName(name), foldPlaceName(ascii)])) {
      if (!key) continue;
      const list = citiesByName.get(key) ?? [];
      list.push(city);
      citiesByName.set(key, list);
    }
  }

  const zonesByCountry = new Map<string, string[]>();
  const countryByName = new Map<string, string>();
  for (const [iso = '', iso3 = '', name = '', zones = ''] of lines(countriesTsv)) {
    zonesByCountry.set(
      iso,
      zones.split(',').filter((zone) => zone && isKnownZone(zone)),
    );
    for (const key of [iso, iso3, name]) if (key) countryByName.set(foldPlaceName(key), iso);
  }
  for (const [iso, aliases] of Object.entries(countryAliases)) {
    for (const alias of aliases) countryByName.set(foldPlaceName(alias), iso);
  }
  return { citiesByName, zonesByCountry, countryByName };
}

let shipped: PlaceIndex | undefined;

// The list shipped with the tool, read once, on first use.
function shippedPlaces(): PlaceIndex {
  shipped ??= parsePlaceFiles(
    readFileSync(new URL('./data/cities.tsv', import.meta.url), 'utf8'),
    readFileSync(new URL('./data/countries.tsv', import.meta.url), 'utf8'),
  );
  return shipped;
}

function fromZones(zones: Iterable<string>): PlaceZone {
  const distinct = [...new Set(zones)];
  if (distinct.length === 0) return { kind: 'none' };
  if (distinct.length === 1) return { kind: 'zone', zone: distinct[0]! };
  return { kind: 'unclear' };
}

// Several zones for a bare city name: the most populous namesake wins only by a wide margin.
function tieBreak(cities: City[]): PlaceZone {
  const top = cities.reduce((best, city) => (city.population > best.population ? city : best));
  const clear = cities.every(
    (city) => city.zone === top.zone || top.population >= TIE_BREAK_FACTOR * city.population,
  );
  return clear ? { kind: 'zone', zone: top.zone } : { kind: 'unclear' };
}

/**
 * The IANA time zone of a place written as "City, Country", "City, …, Country", a country, or a
 * bare city name. "none" when it cannot be placed (empty text included), "unclear" when it could
 * be in more than one zone. Only a bare city name is tie-broken: a named country is never.
 */
export function placeTimeZone(text: string, places: PlaceIndex = shippedPlaces()): PlaceZone {
  const parts = text
    .split(',')
    .map(foldPlaceName)
    .filter((part) => part);
  const first = parts[0];
  if (!first) return { kind: 'none' };

  const last = parts.at(-1)!;
  const lastCountry = parts.length > 1 ? places.countryByName.get(last) : undefined;
  if (lastCountry) {
    const cities = (places.citiesByName.get(first) ?? []).filter(
      (city) => city.country === lastCountry,
    );
    return cities.length > 0
      ? fromZones(cities.map((city) => city.zone))
      : fromZones(places.zonesByCountry.get(lastCountry) ?? []);
  }

  const firstCountry = places.countryByName.get(first);
  if (firstCountry) return fromZones(places.zonesByCountry.get(firstCountry) ?? []);

  const cities = places.citiesByName.get(first) ?? [];
  if (cities.length === 0) return { kind: 'none' };
  const zoned = fromZones(cities.map((city) => city.zone));
  return zoned.kind === 'unclear' ? tieBreak(cities) : zoned;
}
