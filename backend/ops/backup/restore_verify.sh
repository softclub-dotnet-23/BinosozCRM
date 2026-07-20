#!/usr/bin/env bash
# MASTER §11.8: "Восстановление проверяется раз в квартал — непроверенный
# бэкап не бэкап." This is that check — not a manual runbook step someone
# has to remember, a script that fails loudly (nonzero exit, clear
# stderr) if the latest backup can't actually be restored into a working
# database. Meant to run from cron quarterly and feed the same kind of
# "упавшая фоновая задача" alerting §11.8 calls for elsewhere (a
# structured failure here is exactly as urgent as a payroll draft that
# didn't form — an unverified backup is a backup you don't actually have).
#
# Deliberately isolated: spins up a disposable Postgres container (never
# touches the real database), restores into it, runs a couple of sanity
# checks, then tears the container down regardless of outcome. Needs only
# docker + the postgres client tools (pg_restore/psql) on the host running
# this — no .NET toolchain, so it can run on a bare backup/ops box that
# never needs the application deployed to it at all.
set -euo pipefail

: "${RCLONE_REMOTE:?RCLONE_REMOTE is required, e.g. myremote:brigadacrm-backups}"

container_name="brigadacrm-restore-verify-$$"
scratch_dir="$(mktemp -d)"
trap 'docker rm -f "${container_name}" >/dev/null 2>&1 || true; rm -rf "${scratch_dir}"' EXIT

echo "[$(date -u -Iseconds)] Finding latest backup on ${RCLONE_REMOTE}..."
latest_dump="$(rclone lsf "${RCLONE_REMOTE}" --include 'pg_dump_*.dump' | sort | tail -n1)"
if [[ -z "${latest_dump}" ]]; then
  echo "::error::No backups found on ${RCLONE_REMOTE} — nothing to verify." >&2
  exit 1
fi

echo "[$(date -u -Iseconds)] Downloading ${latest_dump}..."
rclone copyto "${RCLONE_REMOTE}/${latest_dump}" "${scratch_dir}/${latest_dump}"

echo "[$(date -u -Iseconds)] Starting scratch Postgres container..."
docker run -d --name "${container_name}" \
  -e POSTGRES_PASSWORD=verify \
  -e POSTGRES_DB=restore_verify \
  -p 0:5432 \
  postgres:16-alpine >/dev/null

scratch_port="$(docker port "${container_name}" 5432/tcp | cut -d: -f2)"

echo "[$(date -u -Iseconds)] Waiting for scratch database to accept connections..."
for _ in $(seq 1 30); do
  if PGPASSWORD=verify pg_isready -h localhost -p "${scratch_port}" -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "[$(date -u -Iseconds)] Restoring ${latest_dump} into the scratch database..."
PGPASSWORD=verify pg_restore \
  --host=localhost \
  --port="${scratch_port}" \
  --username=postgres \
  --dbname=restore_verify \
  --no-owner \
  --no-privileges \
  "${scratch_dir}/${latest_dump}"

echo "[$(date -u -Iseconds)] Restore completed without error. Running sanity checks..."

# Two checks, not one: table count alone would pass on an empty schema
# with no data restored (a real failure mode — a dump that only captured
# DDL). Migrations-history row count proves this is actually a database
# that migrations ran against, not a fresh empty shell.
table_count="$(PGPASSWORD=verify psql -h localhost -p "${scratch_port}" -U postgres -d restore_verify -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")"
migration_count="$(PGPASSWORD=verify psql -h localhost -p "${scratch_port}" -U postgres -d restore_verify -tAc \
  "SELECT count(*) FROM \"__EFMigrationsHistory\";" 2>/dev/null || echo 0)"

echo "[$(date -u -Iseconds)] Tables: ${table_count}, applied migrations: ${migration_count}"

if [[ "${table_count}" -lt 10 || "${migration_count}" -lt 1 ]]; then
  echo "::error::Restore verification FAILED — table_count=${table_count}, migration_count=${migration_count}. The latest backup (${latest_dump}) does not restore to a usable database." >&2
  exit 1
fi

echo "[$(date -u -Iseconds)] Restore verification PASSED for ${latest_dump}."
