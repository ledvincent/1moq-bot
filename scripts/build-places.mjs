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

const attribution = (what, downloadDate) =>
  `# ${what} from GeoNames (geonames.org), downloaded ${downloadDate}. Licence: CC BY 4.0 (creativecommons.org/licenses/by/4.0). See THIRD_PARTY_NOTICES.md.`;

// Lines of a GeoNames file, without comments and blank lines, split on tabs.
function rows(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => line.split('\t'));
}

// A tab or line break inside a value would break the format: GeoNames has none, check anyway.
function clean(value) {
  if (/[\t\r\n]/.test(value)) throw new Error(`Unexpected tab or line break in "${value}"`);
  return value.trim();
}

/**
 * Turns the text of the three GeoNames files into the text of the two place files. Cities without
 * a name, country or zone and countries without a code or name are left out; cities are sorted by
 * name, then country, then largest population first, and countries by ISO code.
 * Types: scripts/build-places.d.mts.
 *
 * @param sources the contents of cities15000.txt (`cities`), countryInfo.txt (`countryInfo`) and
 *   timeZones.txt (`timeZones`)
 * @param downloadDate the day the files were downloaded, YYYY-MM-DD, written in each file's first line
 * @returns the contents of cities.tsv and countries.tsv, and how many places each lists
 * @throws Error when a value holds a tab or a line break
 */
export function buildPlaceFiles(sources, downloadDate) {
  // cities15000.txt: 1 name, 2 asciiname, 8 country code, 14 population, 17 timezone.
  const cities = rows(sources.cities)
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
  for (const [country, zone] of rows(sources.timeZones).slice(1)) {
    if (!country || !zone) continue;
    const zones = zonesByCountry.get(country) ?? [];
    zones.push(clean(zone));
    zonesByCountry.set(country, zones);
  }

  // countryInfo.txt: 0 ISO, 1 ISO3, 4 country name.
  const countries = rows(sources.countryInfo)
    .map((cells) => ({
      iso: clean(cells[0] ?? ''),
      iso3: clean(cells[1] ?? ''),
      name: clean(cells[4] ?? ''),
    }))
    .filter((country) => country.iso && country.name)
    .map((country) => ({ ...country, zones: zonesByCountry.get(country.iso) ?? [] }))
    .sort((a, b) => a.iso.localeCompare(b.iso));

  return {
    cities: [
      attribution('Cities of 15,000 people or more (cities15000)', downloadDate),
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
    countries: [
      attribution('Countries (countryInfo) and their time zones (timeZones)', downloadDate),
      ...countries.map((country) =>
        [country.iso, country.iso3, country.name, country.zones.join(',')].join('\t'),
      ),
      '',
    ].join('\n'),
    cityCount: cities.length,
    countryCount: countries.length,
  };
}

function main(args) {
  const [citiesFile, countryInfoFile, timeZonesFile, downloadDate] = args;
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
  const files = buildPlaceFiles(
    {
      cities: readFileSync(citiesFile, 'utf8'),
      countryInfo: readFileSync(countryInfoFile, 'utf8'),
      timeZones: readFileSync(timeZonesFile, 'utf8'),
    },
    downloadDate,
  );
  writeFileSync(path.join(outDir, 'cities.tsv'), files.cities);
  writeFileSync(path.join(outDir, 'countries.tsv'), files.countries);
  console.log(`Wrote ${files.cityCount} cities and ${files.countryCount} countries to ${outDir}`);
}

// Run as a command only: its tests import buildPlaceFiles without writing anything.
if (import.meta.main) main(process.argv.slice(2));
