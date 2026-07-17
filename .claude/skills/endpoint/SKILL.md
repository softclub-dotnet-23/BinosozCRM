---
name: endpoint
description: Scaffold an API endpoint per MASTER.md §9.
disable-model-invocation: true
argument-hint: "[endpoint description]"
---

1. Find the endpoint in `docs/MASTER.md` §9.4 and the required role in §12.
2. Create:
   - Request DTO (record) + FluentValidation validator
   - Response DTO (record) — **role-aware**: if it exposes `PayRate` or `Document*`,
     check §12 for who sees what, and mask in the DTO, not the client
   - MediatR handler in Application: permission check + `BrigadeId`/`ProrabObjectAssignment`
     filter where applicable (§11.5 — this is manual, EF Core won't do it)
   - Controller action, thin — mapping only
3. Error codes per §9.2 — use the existing catalogue, don't invent a new code if one fits.
4. `Result<T>` for expected failures. 404 not 403 on ownership denial.
5. Async with `CancellationToken`; pagination/sort allow-list per §9.3.
6. Show a curl example.
7. If the contract changed, check callers in `backend/TelegramBot`.

Endpoint: $ARGUMENTS
