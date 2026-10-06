import { defineConfig } from "vitest/config";
import path from "path";

/**
 * The security rules, run against Firebase's own evaluator.
 *
 * Everything else in this repo tests the rules as a document: that the JSON
 * agrees with the domain, that the allowlist gate is spelled correctly. This
 * project is the only thing that tests what Firebase actually DOES with them,
 * which is a different claim and the one that matters on deploy day.
 *
 * It needs the emulator, which needs a JDK, so it runs through
 * `npm run test:rules` rather than as part of the ordinary suite - see the
 * `emulators:exec` wrapper in package.json.
 */
export default defineConfig({
  test: {
    name: "rules",
    environment: "node",
    globals: true,
    setupFiles: [],
    include: ["src/test/rules/**/*.test.ts"],

    /*
      One process. Each file builds a test environment bound to the same
      emulator, and parallel files racing to clear each other's data is the
      classic way this suite becomes flaky.
    */
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },

  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
