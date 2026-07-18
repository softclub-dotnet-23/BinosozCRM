---
name: done
description: Close out the current PROGRESS.md step — build clean, test, update docs, commit locally, report, and stop.
disable-model-invocation: true
allowed-tools: Bash(git add *) Bash(git commit *) Bash(git status *) Bash(git diff *) Bash(dotnet *)
argument-hint: "[commit message]"
---

Stop immediately at any failing step — never commit on a red build.

## 1. Build — zero warnings
`dotnet build backend/backend.slnx`.
Warnings → fix and rebuild, unless suppressed by `.editorconfig` convention.

## 2. Migrations
`dotnet ef migrations list --project backend/Infrastructure --startup-project backend/Api`
Pending → `dotnet ef database update` against the LOCAL dev database only. Never a
shared or production database from this command.

## 3. Tests
`dotnet test backend/backend.slnx --no-build`. Any failure → stop and report.

## 4. Update docs/PROGRESS.md
- Check off the step.
- If the phase is now complete: mark ✅ COMPLETE with today's date and write
  `docs/phase-summaries/Phase{N}-summary.md`: what was built, key files, migrations,
  architecture decisions (including anything that deviated from MASTER.md and why),
  known issues deferred, test coverage, one-paragraph preview of the next phase.
- Update the Current Status block.
- If the step surfaced one of the MASTER §17 open questions, note it in the
  "Открытые вопросы" block at the bottom of PROGRESS.md.

## 5. Commit locally
`git add .`
`git commit -m "<message>"` — $ARGUMENTS if given, else
`Phase X Step Y [BE|BOT|FULL]: <description from PROGRESS.md>`.
Never `git push`.

## 6. Report and stop
---
✅ STEP COMPLETE — [description]
Build:      ✅ 0 warnings
Migrations: ✅ [N applied] / none pending
Tests:      ✅ [N passing]
Committed:  "[message]"
Phase:      [N]% ([X]/[Y] steps)
---
NEXT: [next step title]
Type "go" to continue.
