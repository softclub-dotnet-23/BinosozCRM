---
name: shahrom
description: Triggers when the user writes Шахром or Shahrom - switches focus to Zone B (brigades, workers, attendance, materials, payroll, Telegram bot) per docs/TEAM_SPLIT_Backend_2people.md, and implements that zones next Application/API step. Never touches Domain entities.
---

**Exception to the project's default rule** — see `.claude/skills/ahmad/SKILL.md` for
why. Same reasoning applies here, mirrored to Zone B.

1. Read `docs/TEAM_SPLIT_Backend_2people.md` §2.2 "B — Поле и касса" for the current
   feature list (`Brigade`, `Worker`, `Timesheet`, `AbsenceRecord`, `MaterialRequest`,
   `MaterialConsumptionReport`, `MaterialDelivery`, `WorkOrderPayoutShare`,
   `PayrollEntry`, `PayrollAdvance`, `TelegramLink*`, `backend/TelegramBot`).
2. Read `docs/PROGRESS.md`. Find the first unchecked step in that list. Phase 0 belongs
   entirely to Ahmad (§2.0/§3 of the team-split doc — he writes ALL 26 entities and
   EF configurations up front, both zones) — if Phase 0 isn't finished, say so and stop.
3. Report, tersely: "Шахром — Zone B. Следующий шаг: [step], MASTER §[...]".
4. **Hard boundary (§2.0 and §7 rule 2 of the team-split doc): never create or edit
   files under `backend/Domain/Entities/` or
   `backend/Infrastructure/Persistence/Configurations/`, even for Zone B's own
   entities.** Those belong to Ahmad exclusively — a wrong `decimal(18,3)` vs
   `decimal(18,2)` in a payroll entity is exactly the kind of quiet bug this rule exists
   to prevent. If the step needs a new field or a new entity that doesn't exist yet:
   stop, write out exactly what's needed, and say "нужно от Ахмада: [...]" — don't
   write the entity yourself even as a draft in his folder.
5. Implement the Application/Infrastructure(non-Persistence)/WebApi/TelegramBot part of
   the step, using the entity through `IApplicationDbContext` like any other consumer.
   **If the step touches money** (`PayrollEntry`, `WorkOrderPayoutShare`, anything under
   MASTER §8.0/§8.1/§8.7/§8.8/§8.10) — re-read the worked numeric examples first and
   match them exactly; they're the spec, not illustrations.
6. Don't touch Zone A's Application files
   (`Auth`/`Objects`/`Customers`/`WorkOrders`/`IndividualTasks` folders) even if
   convenient — that's Ahmad's zone.
7. **Exception:** the Telegram bot calling into a WorkOrder command (team-split doc §4)
   is expected — that's a normal call, not a violation. What's NOT allowed is changing
   the *shape* of that command without flagging it, since Ahmad owns the contract.
8. Build, report in `/done`-shape, don't commit automatically — end with "готово, скажи
   `commit` или `done`".

One name mention = one step, never a chain — money code especially needs to be seen
before the next line gets written.
