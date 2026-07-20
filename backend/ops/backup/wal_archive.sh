#!/usr/bin/env bash
# MASTER §11.8: WAL archiving half of "pg_dump ежедневно +
# WAL-архивирование, retention 30 дней, хранение вне того же сервера."
#
# Wired up via postgresql.conf, NOT run directly:
#
#   archive_mode = on
#   archive_command = '/path/to/wal_archive.sh %p %f'
#   wal_level = replica   # (or higher — required for archive_mode to work)
#
# Postgres calls this once per completed WAL segment, passing the segment's
# full path (%p) and bare filename (%f). Must exit 0 only once the segment
# is durably off-server — Postgres will retry indefinitely on nonzero exit,
# which is the correct failure mode (a WAL gap breaks point-in-time
# recovery entirely, so "try again later" beats "silently drop it").
set -euo pipefail

wal_path="$1"
wal_filename="$2"

: "${RCLONE_REMOTE:?RCLONE_REMOTE is required, e.g. myremote:brigadacrm-backups}"

rclone copyto "${wal_path}" "${RCLONE_REMOTE}/wal/${wal_filename}"
