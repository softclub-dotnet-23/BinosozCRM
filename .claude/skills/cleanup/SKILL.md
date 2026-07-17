---
name: cleanup
description: Dead-code, lint, formatting pass. Zero behavior change.
disable-model-invocation: true
---

Hygiene only — must not change what the program does.

1. Remove unused usings/imports, unreachable code, commented-out blocks.
2. Resolve or re-file any TODO/FIXME older than the current phase — either do it or
   turn it into a tracked step in `docs/PROGRESS.md`.
3. `dotnet format`. Fix everything flagged.
4. Rebuild and re-run the full suite. Behavior changed anywhere → that part went too
   far; revert it.

Report a short diff summary, stop. Run `commit` next, not `done` — this isn't a
PROGRESS.md step.
