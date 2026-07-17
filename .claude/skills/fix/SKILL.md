---
name: fix
description: Apply the findings from the most recent review.
disable-model-invocation: true
argument-hint: "[only-critical]"
---

1. Use the findings from the most recent `review`/`security` in this conversation.
   None → run `review` first.
2. Fix every 🔴. Fix 🟡 too, unless the argument is `only-critical`.
3. After each fix rebuild (`dotnet build backend/backend.slnx`). If a fix breaks something
   else, stop and report — don't paper over it.
4. Don't fix anything that wasn't flagged — this isn't a free refactor pass.

Report:
---
✅ FIXED: [#1], [#2], ...
⏭️ SKIPPED: [what's left, and why]
BUILD: ✅ / ❌
---

Does not commit. Run `commit` or `done` next.
