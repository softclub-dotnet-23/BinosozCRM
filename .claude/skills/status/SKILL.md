---
name: status
description: Read-only progress report — no files change.
disable-model-invocation: true
allowed-tools: Read Grep Glob Bash(git log *) Bash(git status *)
---

Read `docs/PROGRESS.md`. Report tersely:

- Total steps / done / remaining, counts and %.
- Current phase and its goal, one line.
- The exact next step and which MASTER.md sections it needs.
- Any blocker from the last phase-summary.
- Any unresolved item in the "Открытые вопросы" block.

Nothing else. Never edits — if something needs fixing, mention it, don't fix it here.
