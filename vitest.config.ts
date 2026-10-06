import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],

    /*
      The bundle budget reads `dist/`, so it can only run after a build. It
      has its own config and its own gate rather than being skipped when the
      directory is absent - a size guard that quietly skips is a size guard
      that is not running.
    */
    exclude: ["src/test/bundle/**", "src/test/rules/**", "**/node_modules/**"],

    /*
      Firebase's web config is public by design, but the SDK still refuses to
      initialise without one. These are throwaway values so `src/config/env.ts`
      validates cleanly and tests never touch a real project.
    */
    env: {
      VITE_FIREBASE_API_KEY: "test-api-key",
      VITE_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "test-project",
      VITE_FIREBASE_STORAGE_BUCKET: "test.appspot.com",
      VITE_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
      VITE_FIREBASE_APP_ID: "1:000000000000:web:test",
    },

    /*
      Call history is cleared between tests so counts never leak.

      `restoreMocks` is deliberately off: it strips the implementation from
      every `vi.fn()`, including the ones inside the shared Firebase module
      mock, which would leave later tests calling a hollow SDK.
    */
    clearMocks: true,
    restoreMocks: false,
    mockReset: false,
    unstubEnvs: true,
    unstubGlobals: true,

    testTimeout: 30000,

    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",

      /*
        Only the code that encodes decisions is measured.

        The vendored shadcn primitives and pure type modules are excluded
        deliberately: including them would inflate the percentage while
        telling nobody whether the booking rules work. Pages are measured
        because they no longer only present - the planner derives journey
        options and both booking entry points gate on the session.
      */
      include: [
        "src/domain/**/*.ts",
        "src/services/**/*.ts",
        "src/contexts/**/*.tsx",
        "src/components/**/*.tsx",
        "src/pages/**/*.tsx",
      ],
      exclude: [
        "src/components/ui/**",
        "src/**/*.d.ts",
        "src/domain/ticket/types.ts",
        "src/**/*.test.{ts,tsx}",
      ],

      /*
        Thresholds are a ratchet, not a target. They sit just below what the
        suite currently achieves so a regression fails CI, and are raised
        deliberately rather than chased.
      */
      thresholds: {
        lines: 95,
        functions: 83,
        branches: 86,
        statements: 95,
      },
    },
  },

  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
