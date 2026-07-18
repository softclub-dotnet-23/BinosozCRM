---
name: migration
description: Draft a schema migration for review. Never applies it.
disable-model-invocation: true
argument-hint: "[description]"
---

1. Show the entity/model changes since the last migration.
2. Propose a name: `YYYYMMDDHHmm_DescriptiveName`.
3. Print the exact command — don't run it:
   `dotnet ef migrations add <Name> --project backend/Infrastructure --startup-project backend/Api`
4. Predict `Up()`/`Down()`.
5. Flag anything risky: data loss, a new required column on a table with existing rows
   (`Worker`, `PayrollEntry` especially — real data), a lock that stalls a large table.
6. **Never apply it to any database.** A human reviews the generated file, then it's
   committed like any other code. From there `done` applies pending migrations to the
   local dev DB, and the deployed app applies them at startup. Authoring stays manual on
   purpose — auto-apply only ever runs already-reviewed migrations.

Description: $ARGUMENTS
