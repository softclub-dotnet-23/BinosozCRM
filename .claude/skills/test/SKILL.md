---
name: test
description: Write tests for a target, following project conventions.
disable-model-invocation: true
argument-hint: "[target]"
---

Read MASTER.md §2 (stack) before writing.

Conventions:
- xUnit + FluentAssertions; Testcontainers for PostgreSQL integration tests
- Naming: `MethodName_StateUnderTest_ExpectedBehavior`
- AAA, blank lines between sections, one assertion concept per test
- No dependence on wall-clock time or randomness without an abstraction — critical for
  `LateMinutes`/`CompletedEarly`

Mandatory cases by area:
- **Money (§8)** — test against the worked numeric examples in MASTER.md; they're
  fixtures, not illustrations. Hourly 160h×40 + 2 paid days = 7040. Lateness 65min@40/h
  = 43.33. Advance 3000 → final 4196.67. Piecework 45m²×120 × 50% = 2700.
- **State machines (§7)** — one test per allowed transition, one per forbidden.
- **Brigade-scoped endpoints** — always "cross-brigade access returns 404".
- **Role-gated endpoints** — always "missing permission denied".
- **Prorab endpoints** — "not assigned to object returns 404" AND "no assignments at
  all = sees everything" (the §1.2 default).
- **Telegram (§10.3)** — same `update_id` twice processes once.
- **18+ (§8.3)** — exactly 18 on hire date passes; one day short fails; back-dated hire
  judged on hire date, not today.

Output complete, runnable files. No placeholders, no `// TODO: add assertions`.

Target: $ARGUMENTS
