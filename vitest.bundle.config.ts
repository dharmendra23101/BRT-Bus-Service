import { defineConfig } from "vitest/config";
import path from "path";

/**
 * The size of what a first-time visitor downloads.
 *
 * Runs against `dist/`, after the build, because the thing being measured is
 * the build - the chunking strategy has silently reverted before while the
 * source still read as if routes were lazy, and the only way to catch that is
 * to weigh the output.
 */
export default defineConfig({
  test: {
    name: "bundle",
    environment: "node",
    globals: true,
    setupFiles: [],
    include: ["src/test/bundle/**/*.test.ts"],
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
