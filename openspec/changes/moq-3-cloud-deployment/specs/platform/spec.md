## ADDED Requirements

### Requirement: Production container image
The system SHALL be released as one container image. Started with the required settings and a reachable PostgreSQL, it SHALL run the web server and the job worker in one process, apply migrations at start, serve the UI at `/` and answer `GET /health`. Started without a required secret, it SHALL refuse to start, naming the missing setting.
Knowledge: `okf/decisions/MOQ-1-cloud-web-service.md`

#### Scenario: Container image serves the UI and health
- **WHEN** the container image is built and started with the required settings and a reachable empty PostgreSQL
- **THEN** the migrations are applied and one process runs the web server and the job worker
- **AND** `GET /` returns the UI shell and `GET /health` answers 200

#### Scenario: Container without a required secret refuses to start
- **WHEN** the container image is started without the database URL
- **THEN** the container exits non-zero without serving
- **AND** its output names the missing setting and prints no setting's value

### Requirement: Dry-run setting fails closed
The system SHALL treat dry-run as on unless the setting is explicitly turned off, SHALL refuse to start when the setting has any other value, naming the setting without printing its value, and SHALL log at start whether dry-run is on or off. The production setup SHALL keep dry-run on until go-live. The send gate applies the mode.
Knowledge: `okf/decisions/MOQ-1-send-gate.md`

#### Scenario: Dry-run on when unset
- **WHEN** the service starts without the dry-run setting, or with it empty
- **THEN** dry-run is on
- **AND** the start-up log says dry-run is on

#### Scenario: Dry-run off when set off
- **WHEN** the service starts with the dry-run setting explicitly set to its off value
- **THEN** dry-run is off
- **AND** the start-up log says dry-run is off

#### Scenario: Invalid dry-run value refuses to start
- **WHEN** the service starts with the dry-run setting set to anything other than its on or off value
- **THEN** it exits without serving, with a message naming the dry-run setting
- **AND** the message does not print the value

#### Scenario: Production deploy keeps dry-run on
- **WHEN** the production setup in the repository is read
- **THEN** it sets dry-run on for the service, whatever the server's settings file holds

### Requirement: No secret values in the repository, the image or the logs
The repository, the container image and the service's logs SHALL hold no secret values. Secrets SHALL be provided on the server from files outside the repository, the image build SHALL exclude local settings files, and settings templates in the repository SHALL hold placeholders only.
Knowledge: `okf/decisions/MOQ-1-personal-data-handling.md`

#### Scenario: Server secrets stay outside the repository
- **WHEN** the repository is inspected
- **THEN** local and server settings files are ignored by git, the production setup reads secrets from files on the server outside the repository, and the settings templates hold placeholders only

#### Scenario: Image holds no secret values
- **WHEN** the built container image is inspected (its files and its configuration)
- **THEN** it holds no local settings file and no secret setting or value

#### Scenario: Start-up log holds no setting values
- **WHEN** the service starts with secret settings and its output is captured
- **THEN** the output holds none of the secret values

### Requirement: Public address over HTTPS
The service SHALL be reached at the public address given by a setting, never written into the code. Plain HTTP SHALL redirect to HTTPS, served with a valid free certificate that renews automatically. From the internet, only HTTPS, the HTTP redirect and SSH SHALL answer; the database port SHALL be closed.
Knowledge: `okf/decisions/MOQ-1-cloud-web-service.md`

#### Scenario: Public address comes from a setting
- **WHEN** the production setup in the repository is read
- **THEN** the public address comes from a setting, and no real or placeholder domain is written into the code or the proxy configuration

#### Scenario: Proxy redirects to HTTPS with a local certificate
- **WHEN** the proxy and the container image are started locally with the address setting set to a local name
- **THEN** a plain HTTP request is redirected to the same address over HTTPS
- **AND** the HTTPS request, trusting the proxy's local certificate, reaches the service and `GET /health` answers 200

#### Scenario: HTTP redirects to HTTPS
- **WHEN** anyone opens the public address over plain HTTP
- **THEN** they are redirected to the same address over HTTPS
- **AND** the HTTPS answer carries a valid certificate from a free certificate authority

#### Scenario: Certificate renews automatically
- **WHEN** the certificate nears its expiry
- **THEN** it is renewed without anyone acting, and the new expiry date is later than the old one

#### Scenario: Only web and SSH ports answer
- **WHEN** the server's public address is scanned from the internet on every TCP port
- **THEN** only the HTTPS, HTTP and SSH ports answer
- **AND** the PostgreSQL port does not answer

### Requirement: Daily encrypted backup on the server
The system SHALL dump the whole database daily on the server, encrypted before it is written, and keep 30 days of dumps there. The key that decrypts the dumps SHALL NOT be kept on the server. A failed or missing daily dump SHALL alert the developer.
Knowledge: `okf/decisions/MOQ-1-personal-data-handling.md`

#### Scenario: Daily backup is encrypted on the server
- **WHEN** the daily backup runs
- **THEN** a new dump of the database is in the server's backup folder
- **AND** the dump cannot be read without the decryption key, which is not on the server, and no unencrypted dump is left on disk

#### Scenario: Server dumps older than 30 days are removed
- **WHEN** the daily backup runs while the server's backup folder holds dumps more than 30 days old
- **THEN** those dumps are removed, and the dumps of the last 30 days are kept

#### Scenario: Failed or missing backup alerts the developer
- **WHEN** the daily backup fails, or does not run at all within its expected day
- **THEN** the developer receives an alert

### Requirement: Off-server copy on the developer's machine
A script run by the developer SHALL copy the server's encrypted dumps that are not yet on the developer's machine, keep them encrypted, remove local copies older than 30 days, and show the date of the last pull and of the newest local copy. The decryption key SHALL be kept apart from the copies.
Knowledge: `okf/decisions/MOQ-1-personal-data-handling.md`

#### Scenario: Pull copies new dumps to the developer's machine
- **WHEN** the developer runs the pull script after new daily dumps were made on the server
- **THEN** the new dumps are on the developer's machine, still encrypted, and dumps already copied are not copied again
- **AND** the script shows the date of this pull and of the newest local copy

### Requirement: Tested restore procedure
A documented procedure SHALL rebuild the service on a blank server from a dump pulled to the developer's machine and the developer's off-server copy of the secrets, restoring every table, the do-not-contact data included. The procedure SHALL be tested once, with its date and result recorded.

#### Scenario: Restore on a blank server
- **WHEN** the documented restore procedure is followed on a blank server with the newest dump pulled to the developer's machine
- **THEN** every table holds the same rows as the backed-up database, the do-not-contact data included
- **AND** `GET /health` answers 200
- **AND** the date and result of the test are recorded in the runbook

### Requirement: Automatic security updates
The server SHALL apply published security updates automatically, restarting itself outside the send windows when an update needs it, and the developer SHALL be able to see when updates last ran and what they installed.

#### Scenario: Security updates applied automatically
- **WHEN** security updates are published for the server's operating system
- **THEN** they are installed without anyone acting
- **AND** the developer's status command shows the date of the last update run and what it installed

### Requirement: Release and rollback by image
Each release SHALL be a container image tagged with its commit. Deploying a tag SHALL replace the running service with that image and keep the data, and redeploying the previous tag SHALL restore the previous version with the data unchanged.
Knowledge: `okf/architecture/overview.md`

#### Scenario: Redeploy the previous image
- **WHEN** a release is deployed and the developer then redeploys the previous tag
- **THEN** the service runs the previous image and `GET /health` answers 200
- **AND** every table holds the same rows as before the rollback

### Requirement: Hosting cost and location confirmed before purchase
The server SHALL cost at most €10 a month, the mailbox excluded, confirmed against the provider's published price and recorded before it is bought, with a budget alert set, or, where the provider offers none, its fixed monthly price and a monthly invoice check recorded. Backups add no paid service. The server SHALL be in an EU region.
Knowledge: `okf/decisions/MOQ-1-cloud-web-service.md`

#### Scenario: Costs confirmed within budget before purchase
- **WHEN** the server plan is chosen
- **THEN** its monthly price, read from the provider's price page with the date, is at most €10 and is recorded before anything is bought
- **AND** once the account exists, a budget alert is set, or, if the provider offers none, the fixed monthly price and a monthly invoice check are recorded

#### Scenario: Server in the EU
- **WHEN** the server is created
- **THEN** its location is in the EU
