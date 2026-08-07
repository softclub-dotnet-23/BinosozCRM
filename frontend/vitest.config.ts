import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Separate from vite.config.ts on purpose: `tsc -b`/`vite build` must never
// pick up test-only config (jsdom, setupFiles) as part of the production
// build graph.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
  },
});
