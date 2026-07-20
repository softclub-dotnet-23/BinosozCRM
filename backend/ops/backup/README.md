# Backups — MASTER §11.8

БригадаCRM holds payroll data: a lost database means the company can no
longer prove who earned what. This directory implements §11.8's backup
requirement in full:

> pg_dump ежедневно + WAL-архивирование, retention 30 дней, хранение вне
> того же сервера. Восстановление проверяется раз в квартал —
> непроверенный бэкап не бэкап.

## What's here

| Script | Runs | Purpose |
|---|---|---|
| `pg_dump_backup.sh` | Daily, cron/systemd timer | Logical backup (`pg_dump -Fc`), synced off-server, old copies pruned past retention |
| `wal_archive.sh` | Per WAL segment, via `archive_command` | Continuous WAL archiving for point-in-time recovery, synced off-server |
| `restore_verify.sh` | Quarterly, cron/systemd timer | Restores the latest backup into a disposable container and checks it's actually usable — exits nonzero (alertable) if not |

## Setup

1. **Off-server storage.** These scripts use [rclone](https://rclone.org)
   rather than a specific cloud vendor — MASTER doesn't name one, and
   picking one here would be inventing an infra decision, not implementing
   a stated one. Configure any rclone-supported remote (S3, GCS, Azure
   Blob, Backblaze B2, SFTP, ...) via `rclone config`, then reference it by
   name in `RCLONE_REMOTE` below.

2. **Environment variables** (`pg_dump_backup.sh` / `wal_archive.sh` /
   `restore_verify.sh`):

   | Variable | Required | Example |
   |---|---|---|
   | `PGHOST` | yes (backup only) | `10.0.0.5` |
   | `PGPORT` | no, default `5432` | `5432` |
   | `PGDATABASE` | yes (backup only) | `brigadacrm` |
   | `PGUSER` | yes (backup only) | `brigadacrm_backup` — a role with read access only, never the app's own role |
   | `RCLONE_REMOTE` | yes | `myremote:brigadacrm-backups` |
   | `BACKUP_STAGING_DIR` | no, default `/var/backups/brigadacrm` | local staging before/after the off-server sync |
   | `RETENTION_DAYS` | no, default `30` | matches §11.8 exactly; override only with a reason |

   `PGPASSWORD` (or a `.pgpass` file) is expected via the standard libpq
   mechanism — never pass it as a script argument, which would leak it into
   `ps`/shell history.

3. **Daily pg_dump** — cron entry (adjust the time to off-peak hours):

   ```
   0 2 * * * PGHOST=... PGDATABASE=... PGUSER=... RCLONE_REMOTE=... /path/to/pg_dump_backup.sh >> /var/log/brigadacrm-backup.log 2>&1
   ```

4. **WAL archiving** — in `postgresql.conf`:

   ```
   archive_mode = on
   wal_level = replica
   archive_command = '/path/to/wal_archive.sh %p %f'
   ```

   Requires `RCLONE_REMOTE` to be available in the environment Postgres
   itself runs under (set it in the systemd unit or an included conf file,
   not inline in `postgresql.conf`).

5. **Quarterly restore verification** — cron entry:

   ```
   0 3 1 */3 * RCLONE_REMOTE=... /path/to/restore_verify.sh >> /var/log/brigadacrm-restore-verify.log 2>&1
   ```

   Wire this cron job's failure into whatever alerting channel MASTER
   §11.8's "алерт на упавшую фоновую задачу" points at for this
   deployment — a nonzero exit here means the last quarter's backups
   cannot actually restore a usable database, which is exactly as urgent
   as any other failed background job this codebase alerts on
   (`PayrollDraftBackgroundService`, `OverdueCheckBackgroundService`).

## Restoring for real (incident runbook)

`restore_verify.sh` proves a backup *can* restore; it never touches the
real database. To actually recover from data loss:

1. Provision a fresh Postgres instance (or stop writes to the existing
   one if it's still reachable but corrupted).
2. `rclone copyto <remote>/<latest pg_dump_*.dump> ./restore.dump`
3. `pg_restore --host=<new host> --username=<role> --dbname=<db> --no-owner --no-privileges ./restore.dump`
4. For point-in-time recovery beyond the last daily dump, restore the
   base backup, then replay archived WAL segments from
   `<remote>/wal/` up to the desired recovery target
   (`recovery_target_time` in `postgresql.conf`/`recovery.signal`) — see
   the [PostgreSQL PITR documentation](https://www.postgresql.org/docs/current/continuous-archiving.html).
5. Point the application's `ConnectionStrings:Default` at the recovered
   instance and run `dotnet ef database update` (or let the app's own
   `Database.MigrateAsync()` startup step confirm the schema is current)
   before resuming traffic.
