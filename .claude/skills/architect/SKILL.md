---
name: architect
description: Discuss or propose an architecture decision — grounded in MASTER.md, never invented.
disable-model-invocation: true
argument-hint: "[topic]"
---

1. Read the relevant `docs/MASTER.md` sections first. Most decisions trace to §2
   (stack), §11 (security), or §8 (business logic).
2. State the question in one sentence.
3. Already decided in MASTER.md? Say so, cite the section, stop.
4. One of the 12 open questions (§17)? Say so, restate the default, and say this is
   the human's call — don't argue for a side.
5. Otherwise: 2–3 real options with genuine trade-offs — not a strawman next to the
   "obviously right" answer.
6. Recommend one, reasoning tied to this project's constraints, not generic best practice.
7. Business decision needed (a rate, a formula, a threshold)? Ask. No code until you have it.

Topic: $ARGUMENTS
