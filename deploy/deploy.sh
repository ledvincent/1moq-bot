#!/usr/bin/env bash
# Deploys an image tag, or rolls back to the previous one, keeping the data.
# Usage: deploy/deploy.sh <tag>     run that tag of $APP_IMAGE
#        deploy/deploy.sh --previous run the last tag deployed ok before the current one
# Takes a backup first and stops if it fails, writes IMAGE_TAG into $MOQ_ETC/release.env,
# replaces the app container, waits for its health and records the result in
# $MOQ_STATE/releases.log. The database volume is never touched.
set -Eeuo pipefail

here="$(dirname "${BASH_SOURCE[0]}")"
# shellcheck source=deploy/lib.sh
source "$here/lib.sh"

HEALTH_SECONDS=90
release_env="$MOQ_ETC/release.env"
releases_log="$MOQ_STATE/releases.log"

if [ "$#" -ne 1 ] || [ -z "$1" ]; then
  echo "usage: $0 <tag>|--previous" >&2
  exit 2
fi
if [ ! -f "$release_env" ]; then
  echo "deploy: missing $release_env" >&2
  exit 1
fi

current_tag() {
  sed -n 's/^IMAGE_TAG=//p' "$release_env" | tail -n 1
}

# The last tag recorded ok in releases.log that is not the current one.
previous_tag() {
  local current="$1"
  [ -f "$releases_log" ] || return 0
  awk -v current="$current" '$3 == "ok" && $2 != current { tag = $2 } END { print tag }' "$releases_log"
}

if [ "$1" = "--previous" ]; then
  tag="$(previous_tag "$(current_tag)")"
  if [ -z "$tag" ]; then
    echo "deploy: no previous release recorded ok in $releases_log" >&2
    exit 1
  fi
  echo "deploy: rolling back to $tag"
else
  tag="$1"
fi
if [[ ! "$tag" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]]; then
  echo "deploy: invalid image tag" >&2
  exit 2
fi

echo "deploy: backup before the release"
if ! bash "$here/backup/backup.sh"; then
  echo "deploy: FAILED, the backup failed; nothing was deployed" >&2
  exit 1
fi

tmp="$(mktemp "$release_env.XXXXXX")"
grep -v '^IMAGE_TAG=' "$release_env" >"$tmp" || true
echo "IMAGE_TAG=$tag" >>"$tmp"
mv -- "$tmp" "$release_env"

mkdir -p -- "$MOQ_STATE"
record() {
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $tag $1" >>"$releases_log"
}

echo "deploy: starting $tag"
if ! moq_compose up -d app; then
  record failed
  echo "deploy: FAILED, $tag did not start" >&2
  exit 1
fi
if ! moq_wait_healthy app "$HEALTH_SECONDS"; then
  record failed
  echo "deploy: FAILED, $tag is not healthy after ${HEALTH_SECONDS}s" >&2
  exit 1
fi
record ok
echo "deploy: ok $tag"
