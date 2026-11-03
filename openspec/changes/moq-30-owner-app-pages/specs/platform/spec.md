# platform delta for MOQ-30

## MODIFIED Requirements

### Requirement: One process serves the UI and runs the jobs
The system SHALL run the web server and the job worker in one process, started by the documented run-locally command, and SHALL serve the owner's app at `/` and at every page address of the app.
Knowledge: `okf/decisions/MOQ-1-typescript-stack.md`

#### Scenario: Local start serves the UI shell
- **WHEN** the developer runs the install and run-locally commands with PostgreSQL running in Docker Compose
- **THEN** one process starts both the web server and the job worker
- **AND** opening `/` in the browser shows the owner's app (the React UI) on its Overview page

## ADDED Requirements

### Requirement: One menu reaches every page
The owner's app SHALL show one menu on every page that reaches its eight pages, in this order: Overview, Find leads, Review, Leads, Emails, Templates, Results, Settings. The menu SHALL mark the page currently open, and a lead's page SHALL mark Leads.
Knowledge: `okf/architecture/overview.md`

#### Scenario: Menu reaches every page
- **WHEN** the owner opens the tool and picks each menu item in turn
- **THEN** the menu shows the eight items, each opens its page, and only the item of the page that is open is marked

### Requirement: Pages show sample data
Until a page is connected to its feature, it SHALL show its layout filled with invented sample data that uses the tool's domain terms, and a visible "Sample data" marker. Sample data SHALL name no real business, person or email address.
Knowledge: `okf/domain/lead-status.md`, `okf/domain/client-types.md`, `okf/domain/outreach-sequence.md`

#### Scenario: Every page shows the sample data marker
- **WHEN** any of the eight pages, or a lead's page, opens
- **THEN** it shows its layout filled with sample data
- **AND** a "Sample data" marker is visible on it

### Requirement: Actions not connected yet change nothing
An action that needs a feature not built yet (search, add a link, approve, reject, Send now, pause, save, and the like) SHALL search, save and send nothing and SHALL make no request to the server. Using it SHALL show a message naming the ticket that will connect it.

#### Scenario: Unconnected action changes nothing
- **WHEN** the owner uses an action that needs a feature not built yet, such as Search on Find leads, Approve on Review, Send now on Emails or Save on Templates or Settings
- **THEN** no request is made and nothing is searched, saved or sent
- **AND** the page shows which ticket will connect that action

### Requirement: Lead page from the list
Each lead in the Leads list SHALL open that lead's own page, at its own address, showing its facts with the source of each, its status and its history.
Knowledge: `okf/domain/lead-status.md`

#### Scenario: Open a lead from the list
- **WHEN** the owner opens a lead in the Leads list
- **THEN** that lead's page opens at its own address
- **AND** it shows that lead's facts with the source of each, its status and its history

### Requirement: Page addresses open their page
Each page of the owner's app SHALL have its own address. Reloading a page or opening its address directly SHALL open the same page. An address that matches no page SHALL show a "Page not found" page, in the same style, with a link back to the Overview.

#### Scenario: Reload keeps the page
- **WHEN** the owner reloads a page, or opens its address directly, including a lead's page
- **THEN** the server answers with the app and the same page opens

#### Scenario: Unknown address shows Page not found
- **WHEN** the owner opens an address that matches no page
- **THEN** a "Page not found" page opens, in the same style, with a link to the Overview

### Requirement: Plain 404 outside the app's pages
An unknown address under `/api/` or `/u/` SHALL get a plain 404 answer, never the owner's app. `GET /health` SHALL keep answering as before.
Knowledge: `okf/architecture/overview.md`

#### Scenario: Unknown API or unsubscribe address gets a plain 404
- **WHEN** an unknown address under `/api/` or `/u/` is requested
- **THEN** the answer is a 404 that is not the app's page
- **AND** `GET /health` still answers as before
