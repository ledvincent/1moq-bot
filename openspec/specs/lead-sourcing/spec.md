# lead-sourcing Specification

## Purpose
Finds candidate businesses for outreach on Google Maps and Instagram, so the owner no longer searches by hand, and keeps exactly one lead per business whichever source found it.

## Requirements

### Requirement: Search Google Maps by business type and city
The system SHALL let the owner run a Google Maps search from a type of business and a city. Each business found SHALL become a lead that records its source, the search it came from, its map place and, when the source gives them, its name, address, city, country and website.
Knowledge: `okf/integrations/google-maps.md`, `okf/domain/lead.md`

#### Scenario: Maps search adds leads
- **WHEN** the owner searches Google Maps for "specialty coffee" in "Melbourne"
- **THEN** each business returned is stored as a lead with source "Google Maps" and a link to that search

#### Scenario: Maps search finds nothing
- **WHEN** a Google Maps search returns no business
- **THEN** the search is listed with zero leads and the owner is told that nothing was found

#### Scenario: Maps source fails
- **WHEN** the Google Maps source fails or refuses a search
- **THEN** the search is marked as failed with a reason the owner can read, and the leads already stored are unchanged

### Requirement: Add a lead from an Instagram profile or website
The system SHALL let the owner add a lead by pasting an Instagram profile link or handle, or a website address. The lead SHALL record its source ("Instagram" or "Manual") and the handle or website given.
Knowledge: `okf/domain/lead.md`, `okf/integrations/instagram.md`

#### Scenario: Add from an Instagram link
- **WHEN** the owner pastes the link of an Instagram profile
- **THEN** a lead is created with source "Instagram" and that profile's handle

#### Scenario: Add from a website
- **WHEN** the owner pastes a website address
- **THEN** a lead is created with source "Manual" and that website

### Requirement: One lead per business
The system SHALL keep a single lead per business. A business found again, by the same map place, the same Instagram handle or the same website domain, SHALL be matched to the existing lead, which keeps every source and search it was found in. Its status and the owner's decision SHALL stay as they were.
Knowledge: `okf/domain/lead.md`, `okf/data/lead.md`

#### Scenario: Same place found twice
- **WHEN** a Google Maps search returns a place that is already a lead
- **THEN** no new lead is created and the existing lead also lists the new search

#### Scenario: Same business from two sources
- **WHEN** the owner adds an Instagram profile whose website domain matches an existing lead
- **THEN** the profile is attached to that lead and no new lead is created

#### Scenario: Rejected lead found again
- **WHEN** a search returns a business the owner already rejected
- **THEN** the lead stays rejected and is not offered for review again

### Requirement: No use of the company's Instagram account
The system SHALL reach Google Maps and Instagram only through official APIs or a data provider's API. It SHALL never sign in to, or automate, the company's Instagram account to find or research leads, and SHALL never send a DM, follow or like.
Knowledge: `okf/decisions/MOQ-1-lead-source-policy.md`, `okf/integrations/instagram.md`

#### Scenario: No Instagram login held
- **WHEN** the system is set up and running
- **THEN** it holds no password or browser session for the company's Instagram account

#### Scenario: No Instagram action taken
- **WHEN** a lead is found or researched through Instagram
- **THEN** the system only reads data and sends no DM, follow or like
