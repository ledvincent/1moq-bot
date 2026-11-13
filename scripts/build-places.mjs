// Builds the tool's offline place list (src/platform/places/data/) from GeoNames files the
// developer downloaded (okf/decisions/MOQ-31-offline-place-lookup.md). Nothing is downloaded here,
// at build or at run time.
//
// Usage:
//   node scripts/build-places.mjs <cities15000.txt> <countryInfo.txt> <timeZones.txt> <download date>
// The files come from the GeoNames export (export/dump/: cities15000.zip unzipped, countryInfo.txt,
// timeZones.txt); the date is the day they were downloaded, as YYYY-MM-DD.
//
// Output, tab-separated, the first line a comment with the source, the date and the licence:
//   cities.tsv     name, ASCII name (empty when equal to the name), country code, IANA zone, population
//   countries.tsv  ISO code, ISO3 code, English name, the country's IANA zones (comma-separated)

/* global console, process, URL */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [citiesFile, countryInfoFile, timeZonesFile, downloadDate] = process.argv.slice(2);
if (
  !citiesFile ||
  !countryInfoFile ||
  !timeZonesFile ||
  !/^\d{4}-\d{2}-\d{2}$/.test(downloadDate ?? '')
) {
  console.error(
    'Usage: node scripts/build-places.mjs <cities15000.txt> <countryInfo.txt> <timeZones.txt> <YYYY-MM-DD>',
  );
  process.exit(1);
}

const outDir = fileURLToPath(new URL('../src/platform/places/data/', import.meta.url));
const attribution = (what) =>
  `# ${what} from GeoNames (geonames.org), downloaded ${downloadDate}. Licence: CC BY 4.0 (creativecommons.org/licenses/by/4.0). See THIRD_PARTY_NOTICES.md.`;

// Lines of a GeoNames file, without comments and blank lines, split on tabs.
function rows(file) {
  return readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => line.split('\t'));
}

// A tab or line break inside a value would break the format: GeoNames has none, check anyway.
function clean(value) {
  if (/[\t\r\n]/.test(value)) throw new Error(`Unexpected tab or line break in "${value}"`);
  return value.trim();
}

// cities15000.txt: 1 name, 2 asciiname, 8 country code, 14 population, 17 timezone.
const cities = rows(citiesFile)
  .map((cells) => ({
    name: clean(cells[1] ?? ''),
    ascii: clean(cells[2] ?? ''),
    country: clean(cells[8] ?? ''),
    population: Number(cells[14] ?? 0),
    zone: clean(cells[17] ?? ''),
  }))
  .filter((city) => city.name && city.country && city.zone)
  .sort(
    (a, b) =>
      a.name.localeCompare(b.name, 'en') ||
      a.country.localeCompare(b.country) ||
      b.population - a.population,
  );

// timeZones.txt: a header line, then country code and zone.
const zonesByCountry = new Map();
for (const [country, zone] of rows(timeZonesFile).slice(1)) {
  if (!country || !zone) continue;
  const zones = zonesByCountry.get(country) ?? [];
  zones.push(clean(zone));
  zonesByCountry.set(country, zones);
}

// countryInfo.txt: 0 ISO, 1 ISO3, 4 country name.
const countries = rows(countryInfoFile)
  .map((cells) => ({
    iso: clean(cells[0] ?? ''),
    iso3: clean(cells[1] ?? ''),
    name: clean(cells[4] ?? ''),
  }))
  .filter((country) => country.iso && country.name)
  .map((country) => ({ ...country, zones: zonesByCountry.get(country.iso) ?? [] }))
  .sort((a, b) => a.iso.localeCompare(b.iso));

writeFileSync(
  path.join(outDir, 'cities.tsv'),
  [
    attribution('Cities of 15,000 people or more (cities15000)'),
    ...cities.map((city) =>
      [
        city.name,
        city.ascii === city.name ? '' : city.ascii,
        city.country,
        city.zone,
        city.population,
      ].join('\t'),
    ),
    '',
  ].join('\n'),
);

writeFileSync(
  path.join(outDir, 'countries.tsv'),
  [
    attribution('Countries (countryInfo) and their time zones (timeZones)'),
    ...countries.map((country) =>
      [country.iso, country.iso3, country.name, country.zones.join(',')].join('\t'),
    ),
    '',
  ].join('\n'),
);

console.log(`Wrote ${cities.length} cities and ${countries.length} countries to ${outDir}`);
