---
name: frontend
description: Scaffold a React screen or component per MASTER.md §13–14.
disable-model-invocation: true
argument-hint: "[screen or component]"
---

New skill — the old doc set had no frontend command because it assumed Blazor, where
the backend agent did both. React is a separate surface and needs its own procedure.

1. Read `docs/MASTER.md` §13 (what the screen does) and §14 (how it looks). Both — a
   screen built without §14 is a screen that gets rebuilt.
2. Check §12 for which roles see this screen and which fields within it.
3. Build:
   - Types from Swagger via `openapi-typescript` — never hand-written
   - Server state via TanStack Query; UI state via Zustand. Never both for the same data
   - Forms: react-hook-form + zod, mirroring FluentValidation with the same numbers
   - Tailwind + shadcn/ui, tokens from §14.1–14.2

Non-negotiable (§13.5, §14):
- **No money math.** Never compute `LateMinutes`, totals, or shares in the browser.
  Display what the API returns. A formula in two places diverges, and the divergence
  lands in a paycheck.
- Accept/Reject **absent from the DOM** outside `OnReview` — not `hidden`, not
  `disabled`, not rendered at all.
- Optimistic drag&drop with **rollback animation** when the backend rejects a transition.
- `ru-RU` locale; `tabular-nums` on every money column.
- Role checks in UI are convenience, not security — the boundary is always the backend.
- Empty/loading/error states designed, not "later": skeleton not spinner, toast not
  blocking modal, empty list with a call to action.

Target: $ARGUMENTS
