@AGENTS.md

## Claude Code specifics

- Use plan mode for any change touching more than one project, or anything under
  `backend/Infrastructure/Migrations/`.
- Full command set lives in `.claude/skills/` — type `/` to see them.
- The technical backstop for the git rule in AGENTS.md is `.claude/settings.json`
  (`permissions.deny`). Don't rely on the written rule alone, and don't weaken
  those entries.
- Auto memory is on. If you correct the same mistake twice in a session, it
  belongs in a rule here, in AGENTS.md, or in the relevant skill.
- Three surfaces share one backend: when a change touches the API contract, check
  callers in BOTH `frontend` (React) and the Telegram bot project before
  assuming only one needs updating.
- `docs/MASTER.md` is 1000 lines. Read the sections the current step names, not
  the whole file — the step in `docs/PROGRESS.md` always says which.

## Current status

Lives in `docs/PROGRESS.md` (top of file), not here — keeps this file stable and
short.