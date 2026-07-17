---
name: entity
description: Scaffold a domain entity per MASTER.md §5.
disable-model-invocation: true
argument-hint: "[entity-name]"
---

**Two-person team note** (`docs/TEAM_SPLIT_Backend_2people.md` §2.0): if this project
is running the 2-person split, this command is Ahmad's alone — the whole
`backend/Domain/Entities/` and `backend/Infrastructure/Persistence/Configurations/`
tree has one owner regardless of which zone the entity's *feature* belongs to. If
you're Shahrom and need an entity for Zone B, don't run this yourself — ask Ahmad
(or trigger `shahrom`).

1. Find $ARGUMENTS in `docs/MASTER.md` §5. Not there → stop and ask. All 26 entities are
   already specified; a 27th needs the same treatment before any code.
2. Read §5 conventions: `Guid.CreateVersion7()`, `ValueGeneratedNever()`, money
   `decimal(18,2)`, quantities `decimal(18,3)`, `timestamptz`, soft-delete except audit
   logs, `CompanyId` except `User`/`Company`/`TelegramUpdateLog`.
3. Create the entity in `backend/Domain/Entities/`:
   - Private setters. Static `Create()` factory — no public constructor
   - Invariants enforced in the factory (18+ is the model: unbypassable by construction)
   - State transitions as methods, never a public enum setter
4. EF configuration in `backend/Infrastructure/Persistence/Configurations/`.
   `UseXminAsConcurrencyToken()` if §5 says `xmin`. Indexes per §6.
5. Register in `ApplicationDbContext` + `IApplicationDbContext`.
6. Migration command per `migration` — do not run.
7. Show everything for review.

Entity: $ARGUMENTS
