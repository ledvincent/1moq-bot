// Types of scripts/build-places.mjs, for the TypeScript tests that import it.

/** The contents of the GeoNames files the place list is built from. */
export interface GeoNamesFiles {
  /** cities15000.txt */
  cities: string;
  /** countryInfo.txt */
  countryInfo: string;
  /** timeZones.txt */
  timeZones: string;
}

/** The contents of the two place files, and how many places each lists. */
export interface PlaceFiles {
  /** cities.tsv */
  cities: string;
  /** countries.tsv */
  countries: string;
  cityCount: number;
  countryCount: number;
}

/** See scripts/build-places.mjs. */
export function buildPlaceFiles(sources: GeoNamesFiles, downloadDate: string): PlaceFiles;
