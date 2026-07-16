---
name: commit
description: Stage and commit locally — for checkpoints, not step completion. No build/test ritual, no PROGRESS.md update.
disable-model-invocation: true
allowed-tools: Bash(git add *) Bash(git commit *) Bash(git status *) Bash(git diff *)
argument-hint: "[message]"
---

## Changes
!`git status --short`
!`git diff --stat`

Stage and commit. $ARGUMENTS verbatim if given, else a conventional-commit message
(`feat:`/`fix:`/`chore:`/`docs:`/`test:`/`refactor:`) that actually describes the diff
above — not "update files".

Never `git push`. Report hash + message, then stop.
