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
The system SHALL treat dry-run as on unless the setting is explicitly turned off, SHALL refuse to start when the setting has any other value, naming the setting without printing its value, and SHALL log at start whether dry-run is on or off. The production stack SHALL keep dry-run on until go-live. The send gate applies the mode.
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
- **WHEN** the production stack definition in the repository is read
- **THEN** it sets dry-run on for the service, whatever the settings files hold

### Requirement: No secret values in the repository, the image or the logs
The repository, the container image and the service's logs SHALL hold no secret values. The production stack SHALL read its settings from files outside the repository, the image build SHALL exclude local settings files, and settings templates in the repository SHALL hold placeholders only.
Knowledge: `okf/decisions/MOQ-1-personal-data-handling.md`

#### Scenario: Settings files stay outside the repository
- **WHEN** the repository is inspected
- **THEN** local and server settings files are ignored by git, the production stack reads its settings from a folder outside the repository, and the settings templates hold placeholders only

#### Scenario: Image holds no secret values
- **WHEN** the built container image is inspected (its files and its configuration)
- **THEN** it holds no local settings file and no secret setting or value

#### Scenario: Start-up log holds no setting values
- **WHEN** the service starts with secret settings and its output is captured
- **THEN** the output holds none of the secret values

### Requirement: Production stack behind HTTPS
The production stack SHALL run the service, PostgreSQL and an HTTPS proxy together, reached at the address given by a setting, never written into the code. Plain HTTP SHALL redirect to HTTPS. Only the proxy SHALL publish ports on the host, for HTTP and HTTPS; PostgreSQL and the service SHALL publish none.
Knowledge: `okf/decisions/MOQ-1-cloud-web-service.md`

#### Scenario: Public address comes from a setting
- **WHEN** the production stack definition in the repository is read
- **THEN** the address comes from a setting, and no real or placeholder domain is written into the code or the proxy configuration

#### Scenario: Proxy redirects to HTTPS with a local certificate
- **WHEN** the production stack is started on the developer's machine with the address setting set to `localhost`
- **THEN** a plain HTTP request is redirected to the same address over HTTPS
- **AND** an HTTPS request that trusts the proxy's local certificate reaches the service, and `GET /health` answers 200

#### Scenario: Only the proxy publishes ports
- **WHEN** the production stack is running
- **THEN** only the proxy publishes host ports, for HTTP and HTTPS
- **AND** PostgreSQL and the service publish no host port

### Requirement: Encrypted database backup
A backup script SHALL write an encrypted dump of the whole database into a backup folder, using a key whose decrypting half is not in the stack, and SHALL then remove dumps older than 30 days. On failure it SHALL exit non-zero with a log line saying the backup failed, leaving no partial or unencrypted file.
Knowledge: `okf/decisions/MOQ-1-personal-data-handling.md`

#### Scenario: Backup writes an encrypted dump
- **WHEN** the backup script runs against the production stack
- **THEN** a new dump is in the backup folder, and it cannot be read without the private key, which is not in the stack
- **AND** decrypted with the private key, it is a complete dump of the database

#### Scenario: Dumps older than 30 days are removed
- **WHEN** the backup script runs while the backup folder holds dumps more than 30 days old
- **THEN** those dumps are removed, and the dumps of the last 30 days are kept

#### Scenario: Failed backup exits with an error
- **WHEN** the backup script runs while the database cannot be dumped
- **THEN** it exits non-zero with a log line saying the backup failed
- **AND** no new, partial or unencrypted file is left in the backup folder

### Requirement: Restore from an encrypted dump
A restore script SHALL rebuild the database of a fresh, empty production stack from an encrypted dump and the private key, restoring every table in every schema, after which the service SHALL start on the restored data.

#### Scenario: Restore into an empty stack
- **WHEN** the restore script is run with an encrypted dump into a fresh production stack with an empty database volume
- **THEN** every table holds the same number of rows as in the backed-up database
- **AND** the service starts and `GET /health` answers 200

### Requirement: Release and rollback by image tag
Each release SHALL be a container image identified by its tag. Deploying a tag SHALL replace the running service with that image and keep the data, and redeploying the previous tag SHALL restore the previous version with the data unchanged.
Knowledge: `okf/architecture/overview.md`

#### Scenario: Redeploy the previous image
- **WHEN** a release tag is deployed and the developer then redeploys the previous tag
- **THEN** the service runs the previous image and `GET /health` answers 200
- **AND** every table holds the same number of rows as before the rollback
