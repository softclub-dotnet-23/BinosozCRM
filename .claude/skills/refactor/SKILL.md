---
name: refactor
description: Restructure toward a stated goal. Zero behavior change — tests are the proof.
disable-model-invocation: true
argument-hint: "[what and why]"
---

1. Confirm tests exist and pass for the code you're touching, BEFORE starting. Thin
   coverage → say so explicitly. Refactoring under-tested money code (§8) is the
   highest-risk thing in this repo.
2. State the goal in one sentence and how you'll know it's achieved.
3. Restructure. No new features, no unrelated fixes, no behavior change in the same pass.
4. Run the full suite after. Same tests, same results = success.
5. Summarize at reviewer level — what moved where and why.

Goal: $ARGUMENTS
