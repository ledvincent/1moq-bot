---
type: Decision
title: A free-text city is placed in a time zone with an offline GeoNames list, never a geocoding API or the AI
description: placeTimeZone turns "City / area" into an IANA zone, "unclear" or "none" from a GeoNames list shipped with the code (cities of 15,000+ people, countries and their zones), with a factor-10 population tie-break for bare city names
owner: vincent.ledreau@dirox.net
status: stable
tags: [platform, time-zones, sourcing]
---
# A free-text city is placed in a time zone with an offline GeoNames list, never a geocoding API or the AI

Date: 2026-11-13 · Jira: MOQ-31 · Change: `openspec/changes/moq-31-read-leads-google-sheet/` (design D3)

## Context

Sending is judged in the lead's IANA time zone, and a lead without one is never scheduled. The sheet gives a free-text "City / area". A geocoding API would be a new paid service or processor, against the €10 budget. An unknown fact must stay unknown, never guessed.

## Decision

- The tool ships a place list built from GeoNames (CC BY 4.0): cities with at least 15,000 people (`cities15000`), with their main and ASCII names, country code, IANA zone and population, and the countries (`countryInfo`, ISO codes and English names) with the zones in each (`timeZones`), plus a short alias list in code (UK, Great Britain, England, Scotland, Wales, Northern Ireland, USA, US, America, and French names of the market countries such as Angleterre, Royaume-Uni, Allemagne, Belgique, Suisse, États-Unis, Australie).
- A developer script, `scripts/build-places.mjs`, turns downloaded GeoNames files (given as arguments) into two tab-separated files in `src/platform/places/data/`, committed with the download date and the attribution in their first line; `THIRD_PARTY_NOTICES.md` gives the attribution. The image carries them with the code; nothing is downloaded at build or run time. Zones Luxon does not know are dropped when the list loads.
- `placeTimeZone(text)` in `src/platform/places/` returns a zone, "unclear" or "none". Names are compared after trimming, lower-casing, removing accents and dots, and collapsing spaces:
  1. Empty → none.
  2. "City, …, Country" whose last part is a country: the zones of the cities of that name in that country; if no city matches, the country's zones. One distinct zone → that zone; more than one → unclear (no tie-break: the owner named the country).
  3. Otherwise the first part. If it is a country's name or code: the country's zones; one → that zone, more than one → unclear.
  4. Otherwise a bare city name: the cities of that name. None → none. One distinct zone → that zone. Several zones → the **tie-break**: the most populous match wins when its population is at least 10 times that of every match in another zone (matches in its own zone do not count against it); otherwise unclear.
  So "Lyon, France" gives Europe/Paris, "Leeds, UK" Europe/London, "France" Europe/Paris, "Paris" Europe/Paris (Paris, Texas is about 25,000 people), "London" Europe/London (London, Ontario is about 400,000 against about 9 million), "Springfield" and "USA" are unclear, an invented place is none. "Manchester" stays unclear (about 400,000 against about 115,000 for Manchester, New Hampshire, under the factor of 10).
- The tie-break was chosen by the person on 2026-11-13, replacing "any name in more than one zone is unclear": a bare city name in the owner's sheet almost always means the far larger city, and the factor of 10 keeps comparable namesakes unclear.
- It lives in `platform` because sourcing uses it now and enrichment (MOQ-7) will use it for leads found elsewhere.

## Alternatives considered

- *A geocoding API (Google Geocoding, Mapbox, OpenCage)*: better at messy input, but a paid or rate-limited service, a new processor receiving lead locations, and network failures inside a sync.
- *The AI*: a guess, against "an unknown fact is never a guess", and a new place where sheet text reaches the AI.
- *Always picking the most populous match*: Springfield, Missouri would win over Springfield, Massachusetts by a few thousand people, a guess with no flag.
- *No tie-break (every name in more than one zone is unclear)*: safe, but Paris and London, the commonest entries, would all need the owner's attention. Replaced on 2026-11-13.
- *GeoNames with alternate names (every language)*: finds "München" or "Londres", but the file grows about tenfold.
- *Downloading the list when the image is built*: a network call and a moving input in every build.

## Consequences

- A bare city name with a namesake of comparable size in another zone (Springfield) is flagged "time zone unclear"; writing "City, Country" fixes it. The sync report lists those rows so the owner can correct the sheet; the owner's own time zone setting comes with a later ticket.
- A bare name the owner meant as the small namesake (Paris, Texas) gets the large city's zone; writing "City, Country" avoids it, and the lead page shows the zone.
- Towns under 15,000 people resolve only through their country, and only when the country has one zone.
- The list (downloaded 2026-11-13) is refreshed by rerunning the script, in a ticket; the unit tests use the shipped list, so a refresh that changes an outcome shows up there. The attribution travels with the data.
