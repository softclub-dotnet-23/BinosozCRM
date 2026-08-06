#!/usr/bin/env bash
# MASTER §11.8: "pg_dump ежедневно + WAL-архивирование, retention 30 дней,
# хранение вне того же сервера." This is the daily logical-backup half —
# WAL archiving is wal_archive.sh, invoked per-segment by Postgres itself
# via archive_command, not by this script.
#
# Intended to run once a day via cron/systemd timer, as the `postgres`
# system user or a role with pg_dump access — never as part of the
# application's own runtime, since a payroll system has no reason to hold
# credentials capable of dumping its own database.
#
# Deliberately provider-agnostic for the off-server destination: MASTER
# doesn't name a cloud vendor, and hardcoding one would be inventing an
# infra decision nobody made. Uses rclone (https://rclone.org) — one tool,
# 40+ supported backends (S3, GCS, Azure Blob, Backblaze B2, SFTP, ...) —
# configured entirely through RCLONE_REMOTE below, so switching providers
# is a config change, not a script rewrite.
set -euo pipefail

: "${PGHOST:?PGHOST is required}"
: "${PGDATABASE:?PGDATABASE is required}"
: "${PGUSER:?PGUSER is required}"
: "${BACKUP_STAGING_DIR:=/var/backups/brigadacrm}"
: "${RCLONE_REMOTE:?RCLONE_REMOTE is required, e.g. myremote:brigadacrm-backups}"
: "${RETENTION_DAYS:=30}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
dump_file="${BACKUP_STAGING_DIR}/pg_dump_${PGDATABASE}_${timestamp}.dump"

mkdir -p "${BACKUP_STAGING_DIR}"

echo "[$(date -u -Iseconds)] Starting pg_dump of ${PGDATABASE}@${PGHOST} -> ${dump_file}"

# Custom format (-Fc): compressed, supports parallel restore, and is what
# pg_restore expects — a plain-SQL dump would work for the restore-check
# below too, but -Fc is the standard choice for anything you actually
# intend to restore under time pressure.
pg_dump \
  --host="${PGHOST}" \
  --port="${PGPORT:-5432}" \
  --username="${PGUSER}" \
  --dbname="${PGDATABASE}" \
  --format=custom \
  --file="${dump_file}"

echo "[$(date -u -Iseconds)] Dump complete ($(du -h "${dump_file}" | cut -f1)). Syncing off-server to ${RCLONE_REMOTE}..."

rclone copy "${dump_file}" "${RCLONE_REMOTE}/" --progress

echo "[$(date -u -Iseconds)] Off-server sync complete."

# Prune anything past retention, locally and on the remote — "хранение вне
# того же сервера" doesn't mean "in addition to forever on this server."
find "${BACKUP_STAGING_DIR}" -name 'pg_dump_*.dump' -mtime "+${RETENTION_DAYS}" -print -delete
rclone delete "${RCLONE_REMOTE}" --min-age "${RETENTION_DAYS}d" --include 'pg_dump_*.dump'

echo "[$(date -u -Iseconds)] Retention prune complete (older than ${RETENTION_DAYS} days removed)."
