# Third-party notices

## GeoNames

The place list in `src/platform/places/data/` (`cities.tsv`, `countries.tsv`) is built by `scripts/build-places.mjs` from the GeoNames files `cities15000`, `countryInfo` and `timeZones`, downloaded on the date written in the first line of each file.

- Source: GeoNames, https://www.geonames.org
- Licence: Creative Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/
- Changes: only the columns the tool uses are kept (city name, ASCII name, country code, time zone, population; country codes, English name and time zones), and the rows are sorted.
