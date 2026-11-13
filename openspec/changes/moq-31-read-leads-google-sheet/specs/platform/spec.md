## MODIFIED Requirements

### Requirement: Pages show sample data
Until a page, or a section of a page, is connected to its feature, it SHALL show its layout filled with invented sample data that uses the tool's domain terms, and a visible "Sample data" marker. A page wholly connected SHALL show no marker; on a page mixing real and sample data, the marker SHALL mark each section still on sample data and no connected section. Sample data SHALL name no real business, person or email address.
Knowledge: `okf/domain/lead-status.md`, `okf/domain/client-types.md`, `okf/domain/outreach-sequence.md`

#### Scenario: Every page shows the sample data marker
- **WHEN** Overview, Review, Emails, Templates or Results opens, or Find leads or Settings opens
- **THEN** each page or section still on sample data shows its layout filled with sample data and a visible "Sample data" marker
- **AND** the Google Sheet sections of Find leads and Settings show no marker

#### Scenario: Connected pages show no marker
- **WHEN** Leads or a lead's page opens
- **THEN** it shows the real leads and no "Sample data" marker
