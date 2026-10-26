#!/usr/bin/env bash
# Restores an encrypted dump into the production stack that deploy/lib.sh points to, whose
# database must be empty (a fresh database volume), then starts the whole stack.
# Usage: deploy/backup/restore.sh <dump file> <private key file>
# Decryption happens here, so the private key stays on the machine that runs this script.
set -Eeuo pipefail

# shellcheck source=deploy/lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/../lib.sh"

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <dump file> <private key file>" >&2
  exit 2
fi
dump="$1"
key="$2"
if [ ! -f "$dump" ]; then
  echo "restore: no dump file at $dump" >&2
  exit 1
fi
if [ ! -f "$key" ]; then
  echo "restore: no private key file at $key" >&2
  exit 1
fi
command -v age >/dev/null

echo "restore: starting postgres"
moq_compose up -d postgres
if ! moq_wait_healthy postgres 120; then
  echo "restore: FAILED, postgres is not healthy" >&2
  exit 1
fi

tables="$(moq_compose exec -T postgres psql -U moq -d moq -tAc \
  "select count(*) from information_schema.tables where table_schema not in ('pg_catalog', 'information_schema')" |
  tr -d '[:space:]')"
if [ "$tables" != "0" ]; then
  echo "restore: REFUSED, the database already has tables; restore only into an empty stack" >&2
  exit 1
fi

echo "restore: restoring $dump"
age -d -i "$key" "$dump" | moq_compose exec -T postgres pg_restore -U moq -d moq --exit-on-error

echo "restore: starting the stack"
moq_compose up -d
if ! moq_wait_healthy app 120; then
  echo "restore: FAILED, the app is not healthy after the restore" >&2
  exit 1
fi
echo "restore: ok"
