#!/usr/bin/env bash
# Encrypted dump of the whole database of the production stack into $MOQ_BACKUP_DIR, then removes
# the dumps older than 30 days. Only the backup public key (BACKUP_RECIPIENT in
# $MOQ_ETC/backup.env) is needed: the dump is never on disk unencrypted.
# Prints `backup: ok <file>`, or `backup: FAILED at <step>` on stderr with a non-zero exit, and
# then leaves no new file in the backup folder.
set -Eeuo pipefail

# shellcheck source=deploy/lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/../lib.sh"

RETENTION_DAYS=30
step="settings"
partial=""

# shellcheck disable=SC2317 # run by the EXIT trap
on_exit() {
  local status=$?
  if [ "$status" -ne 0 ]; then
    if [ -n "$partial" ]; then
      rm -f -- "$partial"
    fi
    echo "backup: FAILED at $step" >&2
  fi
}
trap on_exit EXIT
trap 'exit 1' INT TERM

if [ ! -f "$MOQ_ETC/backup.env" ]; then
  echo "backup: missing $MOQ_ETC/backup.env" >&2
  exit 1
fi
set -a
# shellcheck source=/dev/null
source "$MOQ_ETC/backup.env"
set +a
# A settings file saved on Windows may end its lines with CR.
BACKUP_RECIPIENT="${BACKUP_RECIPIENT:-}"
BACKUP_RECIPIENT="${BACKUP_RECIPIENT%$'\r'}"
if [ -z "$BACKUP_RECIPIENT" ]; then
  echo "backup: missing setting BACKUP_RECIPIENT" >&2
  exit 1
fi
command -v age >/dev/null

step="folder"
mkdir -p -- "$MOQ_BACKUP_DIR"
umask 077

step="dump"
file="$MOQ_BACKUP_DIR/moq-$(date -u +%Y%m%dT%H%M%SZ).dump.age"
while [ -e "$file" ] || [ -e "$file.partial" ]; do
  # Two backups in the same second (a deploy right after a backup): never overwrite one.
  sleep 1
  file="$MOQ_BACKUP_DIR/moq-$(date -u +%Y%m%dT%H%M%SZ).dump.age"
done
partial="$file.partial"
moq_compose exec -T postgres pg_dump -U moq -Fc moq | age -r "$BACKUP_RECIPIENT" -o "$partial"

step="check"
[ -s "$partial" ]

step="rename"
mv -- "$partial" "$file"
partial=""
chmod 0640 -- "$file"

step="rotate"
cutoff="$(date -u -d "$RETENTION_DAYS days ago" +%Y%m%dT%H%M%SZ)"
for old in "$MOQ_BACKUP_DIR"/moq-*.dump.age; do
  [ -e "$old" ] || continue
  name="$(basename -- "$old")"
  taken="${name#moq-}"
  taken="${taken%.dump.age}"
  if [[ "$taken" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] && [[ "$taken" < "$cutoff" ]]; then
    rm -f -- "$old"
  fi
done

echo "backup: ok $file"
