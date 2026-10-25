# platform Specification

## Purpose
Keeps the tool running as one service: it starts with checked settings, brings its database up to date, runs background jobs that survive a restart, serves the UI, reports its health to the host, and gives the developer check commands and CI that stop broken code.

## Requirements

### Requirement: One process serves the UI and runs the jobs
The system SHALL run the web server and the job worker in one process, started by the documented run-locally command, and SHALL serve the UI shell at `/`.
Knowledge: `okf/decisions/MOQ-1-typescript-stack.md`

#### Scenario: Local start serves the UI shell
- **WHEN** the developer runs the install and run-locally commands with PostgreSQL running in Docker Compose
- **THEN** one process starts both the web server and the job worker
- **AND** opening `/` in the browser shows the React UI shell

### Requirement: Health check
The system SHALL answer `GET /health` without sign-in, with 200 while the database answers and 503 while it does not, and SHALL show no lead data in the answer.
Knowledge: `okf/decisions/MOQ-1-cloud-web-service.md`

#### Scenario: Health with the database up
- **WHEN** `GET /health` is called without signing in while the database is reachable
- **THEN** it answers 200

#### Scenario: Health with the database down
- **WHEN** `GET /health` is called while the database is unreachable
- **THEN** it answers 503

### Requirement: Migrations at start
The system SHALL bring the database schema up to date when it starts, applying each migration exactly once.
Knowledge: `okf/decisions/MOQ-1-postgresql-store-and-queue.md`

#### Scenario: Migrations on an empty database
- **WHEN** the service starts on an empty database
- **THEN** every migration is applied and the schema is up to date

#### Scenario: Migrations on a second start
- **WHEN** the service starts again on a database already up to date
- **THEN** no migration is applied again and the data is unchanged

### Requirement: Durable job queue
The system SHALL keep queued jobs in PostgreSQL and run them in the worker of the same process, including jobs queued before a restart.
Knowledge: `okf/decisions/MOQ-1-postgresql-store-and-queue.md`

#### Scenario: Queued job runs in the same process
- **WHEN** a job is queued while the service runs
- **THEN** the worker in the same process runs it

#### Scenario: Queued job survives a restart
- **WHEN** the service stops after a job is queued and before it runs, then starts again
- **THEN** the job runs after the restart

### Requirement: Required settings checked at start
The system SHALL refuse to start when a required setting is missing, with a message that names the missing setting and does not print any setting's value.

#### Scenario: Missing required setting
- **WHEN** the service starts without a required setting such as the database URL
- **THEN** it exits without serving, with a message naming the missing setting

### Requirement: Check commands
The developer's lint, type-check and test commands SHALL exit non-zero and name the file when they find a problem, and the test command SHALL include integration tests against a real PostgreSQL.

#### Scenario: Check commands fail on a problem
- **WHEN** the lint, type-check or test command finds a problem in a file
- **THEN** it exits non-zero and its output names that file

#### Scenario: Integration tests use a real PostgreSQL
- **WHEN** the developer runs the test command
- **THEN** it runs the integration tests against a real PostgreSQL, not a stand-in

### Requirement: Checks on every pull request
Every pull request SHALL run lint, type check, unit tests and integration tests against a PostgreSQL service container in GitHub Actions, next to `dirox-checks`, and any failing check SHALL fail the run.

#### Scenario: CI runs the checks on a pull request
- **WHEN** a pull request is opened or updated
- **THEN** GitHub Actions runs lint, type check, unit tests and integration tests against a PostgreSQL service container, next to `dirox-checks`

#### Scenario: CI fails when a check fails
- **WHEN** any of those checks fails
- **THEN** the run fails
