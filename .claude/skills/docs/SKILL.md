---
name: docs
description: Reconcile docs/MASTER.md with what the code actually does. Fixes drift before it compounds.
disable-model-invocation: true
argument-hint: "[section]"
---

Docs rot silently: a migration moves a field, the code is right, the spec still
describes the old shape for months — noticed at the worst possible time. This is not
hypothetical: it's the exact failure found in the reference project this methodology
came from.

**MASTER.md is write-protected in `.claude/settings.json`.** You cannot edit it. That's
deliberate — the spec changes by human decision, not by an agent reconciling it away.

So this command REPORTS, it does not fix:

1. Pick the target: $ARGUMENTS (a §-section), or everything if blank.
2. For each concrete claim — a field, an endpoint, a formula, a transition rule — check
   it against the actual code. Not against memory of what the code used to do.
3. Report a table: section, what MASTER.md says, what the code does, which is right.
4. For each mismatch, state plainly which side you think is wrong and why. Don't
   silently assume the code wins — in a payroll system the spec is often the one that's
   right and the code is the bug.
5. Anything in §17 (open questions) that's still undecided → not drift, skip it.

Output the table and stop. The human decides what changes.
