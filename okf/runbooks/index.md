# Runbooks

* [Back up and restore the production database](backup-and-restore.md) - Create the age key pair and keep the private key apart, run the encrypted backup, restore a dump into an empty stack and compare the row counts of every table
* [Deploy a release and roll it back](deploy-and-rollback.md) - Build and tag an image, deploy the tag with deploy/deploy.sh (backup first, health check, releases log), roll back with --previous, and the rule that keeps migrations compatible with the previous release
* [Run the production stack on the developer's machine](local-production-stack.md) - Install the tools, create the git-ignored .deploy-local settings, build and tag the image, start and stop the app, PostgreSQL and Caddy stack, and open it at https://localhost
