import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildPlaceFiles } from '../scripts/build-places.mjs';

// Small GeoNames-shaped files written here: nothing is downloaded.

const CITIES_HEADER =
  '# Cities of 15,000 people or more (cities15000) from GeoNames (geonames.org), downloaded 2026-11-13. Licence: CC BY 4.0 (creativecommons.org/licenses/by/4.0). See THIRD_PARTY_NOTICES.md.';
const COUNTRIES_HEADER =
  '# Countries (countryInfo) and their time zones (timeZones) from GeoNames (geonames.org), downloaded 2026-11-13. Licence: CC BY 4.0 (creativecommons.org/licenses/by/4.0). See THIRD_PARTY_NOTICES.md.';
const TIME_ZONES_HEADER =
  'CountryCode\tTimeZoneId\tGMT offset 1. Jan 2026\tDST offset 1. Jul 2026\trawOffset (independant of DST)';

interface City {
  name: string;
  ascii?: string;
  country: string;
  population: string;
  zone: string;
}

// A cities15000.txt line: the five columns the script reads, every other one holding a value it
// must not take (another name, a second country code, an elevation, a date).
function cityLine({ name, ascii = name, country, population, zone }: City): string {
  return [
    '2996944',
    name,
    ascii,
    'Decoy alternate name',
    '45.74846',
    '4.84671',
    'P',
    'PPLA',
    country,
    'ZZ',
    '84',
    '69',
    '693',
    '69123',
    population,
    '173',
    '174',
    zone,
    '2026-01-01',
  ].join('\t');
}

// A countryInfo.txt line: ISO, ISO3 and the name in columns 0, 1 and 4, decoys elsewhere.
function countryLine(iso: string, iso3: string, name: string): string {
  return [iso, iso3, '250', 'FD', name, 'Decoy capital', '547030', '66987244', 'EU', '.zz'].join(
    '\t',
  );
}

const lyon: City = { name: 'Lyon', country: 'FR', population: '522250', zone: 'Europe/Paris' };
const montreal: City = {
  name: 'Montréal',
  ascii: 'Montreal',
  country: 'CA',
  population: '1762949',
  zone: 'America/Toronto',
};

function build(files: { cities?: string[]; countryInfo?: string[]; timeZones?: string[] }) {
  return buildPlaceFiles(
    {
      cities: [...(files.cities ?? []), ''].join('\n'),
      countryInfo: [...(files.countryInfo ?? []), ''].join('\n'),
      timeZones: [TIME_ZONES_HEADER, ...(files.timeZones ?? []), ''].join('\n'),
    },
    '2026-11-13',
  );
}

// The city lines of cities.tsv, without its first (attribution) line.
function cityRows(cities: City[]) {
  return build({ cities: cities.map(cityLine) })
    .cities.split('\n')
    .slice(1, -1);
}

describe('scripts/build-places.mjs: cities.tsv', () => {
  it('writes name, ASCII name, country code, zone and population from GeoNames columns 1, 2, 8, 17 and 14', () => {
    const files = build({ cities: [cityLine(montreal)] });
    expect(files.cities).toBe(
      `${CITIES_HEADER}\nMontréal\tMontreal\tCA\tAmerica/Toronto\t1762949\n`,
    );
    expect(files.cityCount).toBe(1);
  });

  it('leaves the ASCII name empty when it equals the name', () => {
    expect(cityRows([lyon])).toEqual(['Lyon\t\tFR\tEurope/Paris\t522250']);
  });

  it('leaves out a city without a name, a country code or a zone', () => {
    const files = build({
      cities: [
        cityLine({ ...lyon, name: '', ascii: 'Nameless' }),
        cityLine({ ...lyon, name: 'No Country', country: '' }),
        cityLine({ ...lyon, name: 'No Zone', zone: '' }),
        // A line cut short before the zone column.
        ['1', 'Short Line', 'Short Line', '', '', '', 'P', 'PPL', 'FR'].join('\t'),
        cityLine(lyon),
      ],
    });
    expect(files.cities.split('\n').slice(1, -1)).toEqual(['Lyon\t\tFR\tEurope/Paris\t522250']);
    expect(files.cityCount).toBe(1);
  });

  it('skips comment and blank lines, and reads Windows line endings', () => {
    const files = buildPlaceFiles(
      {
        cities: `# GeoNames export\r\n\r\n   \r\n${cityLine(lyon)}\r\n${cityLine(montreal)}\r\n`,
        countryInfo: '',
        timeZones: TIME_ZONES_HEADER,
      },
      '2026-11-13',
    );
    expect(files.cities.split('\n').slice(1, -1)).toEqual([
      'Lyon\t\tFR\tEurope/Paris\t522250',
      'Montréal\tMontreal\tCA\tAmerica/Toronto\t1762949',
    ]);
  });

  it('trims the spaces around a value', () => {
    expect(cityRows([{ ...lyon, name: ' Lyon ', ascii: 'Lyon ', zone: ' Europe/Paris' }])).toEqual([
      'Lyon\t\tFR\tEurope/Paris\t522250',
    ]);
  });

  it('sorts cities by name as English readers do, accents and case aside', () => {
    const rows = cityRows([
      {
        name: 'Zürich',
        ascii: 'Zurich',
        country: 'CH',
        population: '341730',
        zone: 'Europe/Zurich',
      },
      { name: 'Évry', ascii: 'Evry', country: 'FR', population: '50000', zone: 'Europe/Paris' },
      { name: 'aachen', country: 'DE', population: '249070', zone: 'Europe/Berlin' },
      lyon,
    ]);
    expect(rows.map((row) => row.split('\t')[0])).toEqual(['aachen', 'Évry', 'Lyon', 'Zürich']);
  });

  it('orders cities of the same name by country code, then the largest population first', () => {
    // London, Ontario comes before the larger London, England: country first, population second.
    const rows = cityRows([
      { name: 'Springfield', country: 'US', population: '116250', zone: 'America/Chicago' },
      { name: 'London', country: 'GB', population: '8961989', zone: 'Europe/London' },
      { name: 'Springfield', country: 'US', population: '155929', zone: 'America/New_York' },
      { name: 'London', country: 'CA', population: '422324', zone: 'America/Toronto' },
    ]);
    expect(rows).toEqual([
      'London\t\tCA\tAmerica/Toronto\t422324',
      'London\t\tGB\tEurope/London\t8961989',
      'Springfield\t\tUS\tAmerica/New_York\t155929',
      'Springfield\t\tUS\tAmerica/Chicago\t116250',
    ]);
  });

  it('refuses a value holding a line break', () => {
    expect(() => build({ cities: [cityLine({ ...lyon, name: 'Ly\ron' })] })).toThrow(
      'Unexpected tab or line break in "Ly\ron"',
    );
  });

  it('writes only the attribution line when no city is kept', () => {
    const files = build({ cities: ['# nothing but a comment'] });
    expect(files.cities).toBe(`${CITIES_HEADER}\n`);
    expect(files.cityCount).toBe(0);
  });
});

describe('scripts/build-places.mjs: countries.tsv', () => {
  it('writes ISO code, ISO3 code and name from countryInfo columns 0, 1 and 4, with the zones of timeZones in their order', () => {
    const files = build({
      countryInfo: [
        '#ISO\tISO3\tISO-Numeric\tfips\tCountry',
        countryLine('US', 'USA', 'United States'),
        countryLine('FR', 'FRA', 'France'),
      ],
      timeZones: [
        'US\tAmerica/New_York\t-5.0\t-4.0\t-5.0',
        'FR\tEurope/Paris\t1.0\t2.0\t1.0',
        'US\tAmerica/Chicago\t-6.0\t-5.0\t-6.0',
      ],
    });
    expect(files.countries).toBe(
      `${COUNTRIES_HEADER}\nFR\tFRA\tFrance\tEurope/Paris\nUS\tUSA\tUnited States\tAmerica/New_York,America/Chicago\n`,
    );
    expect(files.countryCount).toBe(2);
  });

  it('leaves the zones empty for a country timeZones does not list', () => {
    const files = build({ countryInfo: [countryLine('BV', 'BVT', 'Bouvet Island')] });
    expect(files.countries.split('\n').slice(1, -1)).toEqual(['BV\tBVT\tBouvet Island\t']);
  });

  it('ignores a timeZones line without a country code or a zone', () => {
    const files = build({
      countryInfo: [countryLine('FR', 'FRA', 'France')],
      timeZones: ['FR\t', '\tEurope/Paris', 'FR\tEurope/Paris\t1.0\t2.0\t1.0'],
    });
    expect(files.countries.split('\n').slice(1, -1)).toEqual(['FR\tFRA\tFrance\tEurope/Paris']);
  });

  it('leaves out a country without an ISO code or a name', () => {
    const files = build({
      countryInfo: [
        countryLine('', 'XXX', 'No Code'),
        countryLine('ZZ', 'ZZZ', ''),
        countryLine('FR', 'FRA', 'France'),
      ],
      timeZones: ['FR\tEurope/Paris'],
    });
    expect(files.countries.split('\n').slice(1, -1)).toEqual(['FR\tFRA\tFrance\tEurope/Paris']);
    expect(files.countryCount).toBe(1);
  });
});

describe('scripts/build-places.mjs as a command', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));

  // Only argument lists the script refuses: a run it accepts would rewrite the committed data.
  it.each([
    [[]],
    [['cities15000.txt', 'countryInfo.txt', 'timeZones.txt']],
    [['cities15000.txt', 'countryInfo.txt', 'timeZones.txt', '13/11/2026']],
  ])('refuses %j with its usage, writing nothing', (args) => {
    const result = spawnSync(process.execPath, ['scripts/build-places.mjs', ...args], {
      cwd: root,
      encoding: 'utf8',
      timeout: 30_000,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Usage: node scripts/build-places.mjs <cities15000.txt> <countryInfo.txt> <timeZones.txt> <YYYY-MM-DD>',
    );
    expect(result.stdout).toBe('');
  });
});
