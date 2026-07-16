---
name: start
description: Session-start ritual — read status, verify build, report, and wait for confirmation before writing code.
disable-model-invocation: true
---

1. Re-read `AGENTS.md`/`CLAUDE.md` in full.
2. Read `docs/PROGRESS.md` — Current Status + the first unchecked step.
3. Read ONLY the `docs/MASTER.md` sections that step references. Not the whole file.
4. Read `docs/phase-summaries/*` for the current and previous phase, if any.

## Recent history
!`git log --oneline -10`
!`git status --short`

## Build
Run `dotnet build BrigadaCRM.sln`. If React files exist, also `npm run build` in
`src/BrigadaCRM.Web`. Note pass/fail and warnings.

Report exactly this shape, then stop:

---
CURRENT: Phase X — Step Y
LAST DONE: [one line]
NEXT: [one line + which MASTER.md sections it needs]
BUILD: ✅ green / ❌ red — [detail if red]
BLOCKERS: [from last phase-summary, or none]
---

Wait for confirmation. Do not write code in this turn.
