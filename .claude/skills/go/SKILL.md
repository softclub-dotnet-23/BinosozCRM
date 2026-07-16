---
name: go
description: Implement the next unfinished step in docs/PROGRESS.md — exactly one step, nothing more.
disable-model-invocation: true
argument-hint: "[step-number]"
---

1. Open `docs/PROGRESS.md`, find the first unchecked step, top to bottom.
2. Read the `docs/MASTER.md` sections that step names — every step has them after `→ MASTER §`.
3. Implement only that step:
   - `[BE]` — backend only
   - `[FE]` — React only
   - `[BOT]` — Telegram bot only
   - `[FULL]` — backend first, then the others; all must build clean
4. If the step touches money (§8), re-read the worked numeric examples and make the
   implementation match them exactly — they're the spec, not illustrations.
5. If anything is ambiguous or hits one of the 12 open questions (MASTER §17) — stop
   and ask. Implement the stated default and keep it configurable; never invent a rate,
   formula, or threshold.
6. Do not run `done` yourself. Do not start the next step. Implement, report, say it's
   ready for `done`.

Target: $ARGUMENTS (blank = next in order; a number jumps only if out-of-order is
actually valid — otherwise refuse and say why)
