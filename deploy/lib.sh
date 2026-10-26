#!/usr/bin/env bash
# Shared by the deploy scripts (source it, do not run it): the settings folders and the one
# command that runs the production stack. The defaults are the server paths; on the developer's
# machine point the variables to .deploy-local/ (see the local production stack runbook).
#   MOQ_ETC         settings files app.env, backup.env, release.env   (default /etc/1moq)
#   MOQ_BACKUP_DIR  encrypted dumps                                    (default /var/backups/1moq)
#   MOQ_STATE       releases.log                                       (default /var/lib/1moq)
#   COMPOSE_PROJECT_NAME                                               (default moq)

MOQ_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOQ_ETC="${MOQ_ETC:-/etc/1moq}"
MOQ_BACKUP_DIR="${MOQ_BACKUP_DIR:-/var/backups/1moq}"
MOQ_STATE="${MOQ_STATE:-/var/lib/1moq}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-moq}"

# Git Bash on Windows: Windows programs (docker, age) need C:/... paths. Elsewhere unchanged.
moq_path() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -m "$1"
  else
    printf '%s\n' "$1"
  fi
}
MOQ_ROOT="$(moq_path "$MOQ_ROOT")"
MOQ_ETC="$(moq_path "$MOQ_ETC")"
MOQ_BACKUP_DIR="$(moq_path "$MOQ_BACKUP_DIR")"
MOQ_STATE="$(moq_path "$MOQ_STATE")"
export MOQ_ROOT MOQ_ETC MOQ_BACKUP_DIR MOQ_STATE COMPOSE_PROJECT_NAME

# The production stack, always started this way: by the scripts, the tests and the developer.
# MSYS_NO_PATHCONV stops Git Bash from rewriting container paths such as /data/... in arguments.
moq_compose() {
  MSYS_NO_PATHCONV=1 docker compose \
    --project-name "$COMPOSE_PROJECT_NAME" \
    --file "$MOQ_ROOT/deploy/compose.yml" \
    --env-file "$MOQ_ETC/app.env" \
    --env-file "$MOQ_ETC/release.env" \
    "$@"
}

# Waits until a service's container reports healthy: moq_wait_healthy <service> <seconds>.
moq_wait_healthy() {
  local service="$1" seconds="$2" id status waited=0
  while [ "$waited" -lt "$seconds" ]; do
    id="$(moq_compose ps -q "$service" 2>/dev/null || true)"
    if [ -n "$id" ]; then
      status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$id" 2>/dev/null || true)"
      if [ "$status" = "healthy" ]; then
        return 0
      fi
    fi
    sleep 2
    waited=$((waited + 2))
  done
  return 1
}
