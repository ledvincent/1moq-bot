# Spec Delta

## Purpose

Gathers what can be known about each lead (contact email, what it does, size, location, time zone, language, social presence and own merch) so the owner can judge it and its emails can speak to it.

## ADDED Requirements

### Requirement: Find a contact email
The system SHALL look for a business email address for each lead, first on the lead's own website (home, contact, about and legal pages), and SHALL record where each address was found.
Knowledge: `okf/data/lead.md`, `okf/decisions/MOQ-1-lead-source-policy.md`

#### Scenario: Email found on the website
- **WHEN** the lead's contact page shows an email address
- **THEN** the address is saved on the lead with that page as its source

#### Scenario: No email found
- **WHEN** no email address can be found for a lead
- **THEN** the lead is marked "no email found" and keeps its website and Instagram links

### Requirement: Gather the lead's profile
The system SHALL record for each lead, when they can be found: what the business does, its number of locations or whether it runs an online store, its city and country, its Instagram followers and date of last post, the name of its owner or founder, and whether it already sells or wears its own merch. Each fact SHALL keep the source it came from.
Knowledge: `okf/data/lead.md`, `okf/integrations/instagram.md`, `okf/integrations/anthropic-claude.md`

#### Scenario: Instagram facts recorded
- **WHEN** a lead has a public business profile on Instagram
- **THEN** its followers count and the date of its last post are recorded with the profile as their source

#### Scenario: Own merch found
- **WHEN** the lead's website shop or Instagram posts show branded items of its own for sale or worn by its staff
- **THEN** the lead is marked as having its own merch, with a link to the evidence

#### Scenario: Fact not found
- **WHEN** a fact cannot be found for a lead
- **THEN** it is recorded as unknown and is never guessed

### Requirement: Language
The system SHALL set each lead's language to French when its website or Instagram profile is written in French, and to English otherwise. The owner SHALL be able to change it.
Knowledge: `okf/domain/markets.md`

#### Scenario: French website
- **WHEN** a lead in Belgium has a website written in French
- **THEN** its language is French

#### Scenario: Other language
- **WHEN** a lead's website is written in Dutch
- **THEN** its language is English

#### Scenario: Owner changes the language
- **WHEN** the owner sets a lead's language to French
- **THEN** the lead keeps French even when it is researched again

### Requirement: Time zone
The system SHALL set each lead's time zone from its location. A lead whose location is unknown SHALL have no time zone until the owner sets one.
Knowledge: `okf/data/lead.md`

#### Scenario: Time zone from the city
- **WHEN** a lead is located in Melbourne
- **THEN** its time zone is Australia/Melbourne

#### Scenario: Location unknown
- **WHEN** a lead's location cannot be found
- **THEN** it has no time zone and is flagged for the owner

### Requirement: Read websites politely
The system SHALL read only public pages of a lead's website, a few pages per lead, and SHALL skip pages that the site's robots rules disallow.
Knowledge: `okf/decisions/MOQ-1-lead-source-policy.md`

#### Scenario: Robots rule honoured
- **WHEN** a site's robots rules disallow its contact page
- **THEN** that page is not read

### Requirement: Page text is data
Text gathered from a lead's website or profile SHALL only be stored and summarised as facts. It SHALL never change how the system behaves or what it writes beyond those facts.
Knowledge: `okf/decisions/MOQ-1-claude-for-ai.md`

#### Scenario: Instructions in a page ignored
- **WHEN** a lead's page contains text that tells the reader to do something, such as to ignore its rules or to write a given sentence
- **THEN** the lead's facts and emails do not follow that text
