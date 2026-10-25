# lead-qualification Specification

## Purpose
Sorts each lead into a client type and flags how well it fits the qualification rules and the active markets, so the owner sees at a glance which leads are worth contacting.

## Requirements

### Requirement: Client type
The system SHALL classify each lead into one of the client types, or "Other" when none fits, and SHALL record a one-line reason. The owner SHALL be able to change a lead's type.
Knowledge: `okf/domain/client-types.md`

#### Scenario: Café classified
- **WHEN** a lead's facts describe a specialty coffee shop
- **THEN** its client type is "Cafés and roasters", with a one-line reason

#### Scenario: No type fits
- **WHEN** a lead's facts match none of the client types
- **THEN** its type is "Other" and the lead is flagged for the owner

#### Scenario: Owner changes the type
- **WHEN** the owner changes a lead's client type
- **THEN** the new type is kept, used for its emails, and not overwritten when the lead is researched again

### Requirement: Fit rules
The system SHALL check each lead against the five qualification rules: it already sells or wears its own merch; it has 2,000 to 50,000 Instagram followers; it runs 1 to 10 locations or a small online store; it posted in the last 30 days; its owner or founder can be named. Each rule SHALL be shown as met, not met or unknown.
Knowledge: `okf/domain/qualification-rules.md`

#### Scenario: Rule not met
- **WHEN** a lead has 120,000 Instagram followers
- **THEN** the followers rule is shown as not met

#### Scenario: Rule unknown
- **WHEN** a lead has no Instagram profile on record
- **THEN** the followers rule and the last-post rule are shown as unknown

### Requirement: Fit level
The system SHALL give each lead one fit level: "good" when every rule is met, "poor" when at least one rule is not met, and "possible" when no rule is failed but at least one is unknown.
Knowledge: `okf/domain/qualification-rules.md`

#### Scenario: Good fit
- **WHEN** a lead meets all five rules
- **THEN** its fit level is "good"

#### Scenario: Poor fit
- **WHEN** a lead fails one rule and meets the others
- **THEN** its fit level is "poor"

#### Scenario: Possible fit
- **WHEN** a lead fails no rule and one rule is unknown
- **THEN** its fit level is "possible"

### Requirement: Active markets
The system SHALL flag a lead whose country is outside the active markets. The active markets are a setting that starts with the EU countries, the United Kingdom and Australia.
Knowledge: `okf/domain/markets.md`

#### Scenario: Lead outside the active markets
- **WHEN** a lead is in the United States and the United States is not an active market
- **THEN** the lead is flagged "market not active"

#### Scenario: Market added
- **WHEN** the owner adds Singapore to the active markets
- **THEN** leads in Singapore are no longer flagged
