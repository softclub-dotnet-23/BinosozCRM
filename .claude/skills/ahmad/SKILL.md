---
name: ahmad
description: Triggers when the user writes Ахмад or Ahmad - switches focus to Zone A per docs/TEAM_SPLIT_Backend_2people.md, and implements that zones next step. Also the sole owner of the entire Domain layer for both zones, and team lead.
---

**Exception to the project's default rule.** Every other command in this project is
`disable-model-invocation: true` — nothing runs without an explicit `/command`. This
skill is deliberately the opposite: it triggers on the bare name, because that's what
was asked for (two people sharing one terminal, name = "it's my turn"). Keep the scope
narrow to compensate — one step, then stop, same as `/go`.

1. Read `docs/TEAM_SPLIT_Backend_2people.md` §2.0 and §2.1. Two responsibilities live
   here, not one:
   - **Zone A features**: identity/auth, `ConstructionObject`, `EstimateItem`,
     `Customer`, `ProrabObjectAssignment`, `WorkOrder`, `WorkOrderProgress`,
     `IndividualTask`, `TaskLog`, `AdminAuditLog`, plus solution/DI/CI scaffolding.
   - **All Domain, for both zones** (§2.0): every file under
     `backend/Domain/Entities/` and
     `backend/Infrastructure/Persistence/` (configurations + `ApplicationDbContext`
     itself) — all 26 entities from MASTER.md §5, not just Zone A's 13. Shahrom never
     touches these even for his own zone's entities.
2. Read `docs/PROGRESS.md`. Priority order:
   a. If any entity from MASTER §5 doesn't exist yet in `Domain/Entities/` — especially
      early in the project, prefer finishing the Domain layer for **both** zones before
      picking up a Zone-A feature step. Shahrom is blocked on Zone B entities until they
      exist; don't leave him waiting longer than necessary.
   b. Otherwise, first unchecked step whose files are in the Zone A feature list.
3. Report, tersely: "Ахмад — Zone A [+ Domain]. Следующий шаг: [step], MASTER §[...]".
4. Implement exactly that one step — read the referenced MASTER.md sections first,
   don't invent business rules. If writing an entity for Zone B (e.g. `PayrollEntry`),
   follow MASTER §5's spec exactly — precision and scale of every `decimal`, nullability,
   `xmin` where specified — Shahrom's Application code will assume these are already
   correct.
5. If Shahrom has requested a field/entity change (via a message like "нужно от Ахмада:
   ..."), that request takes priority over the next PROGRESS.md step — a blocked
   teammate costs more than sequence purity.
6. **Coordination point** (team-split doc §4): if a step changes the *contract* of a
   MediatR command the Telegram bot calls (`SubmitWorkOrderProgressCommand` etc.), flag
   it explicitly in the report — Shahrom's bot code depends on that shape.
7. Build, report in `/done`-shape, don't commit automatically — end with "готово, скажи
   `commit` или `done`".

Do not chain into a second step even if several are unchecked in a row — one name
mention = one step, so the human sees each one before the next. Migrations (§5 of the
team-split doc) are also exclusively yours — see `.claude/skills/migration/SKILL.md`.
