import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// vitest.config.ts doesn't set `test.globals: true` (tsc -b would otherwise
// need "vitest/globals" ambient types added to tsconfig.app.json just for
// this) — @testing-library/react's auto-cleanup relies on a global afterEach
// existing, so without it stale DOM from one test's render() silently
// accumulates in the next test's document. Register it explicitly instead.
afterEach(() => {
  cleanup();
});
