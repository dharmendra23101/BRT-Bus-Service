import { defineConfig } from "vitest/config";
import path from "path";

/**
 * The domain, run as if there were no browser.
 *
 * `src/domain` is the one asset that transfers to a native app, and it is
 * already platform-clean: no React, no Firebase, no DOM. This config turns
 * that from a fact somebody measured once into an invariant - no jsdom, no
 * setup file, no React plugin and no Firebase mocks, so the day a domain
 * module reaches for `window`, `document` or a React hook, this fails while
 * the main suite stays green and says nothing.
 *
 * It is deliberately NOT a second package. Extracting the domain would mean
 * adopting a second build toolchain, and toolchain is the part that rots; the
 * `@/` alias absorbs the eventual move whenever a native app is genuinely
 * commissioned.
 */
export default defineConfig({
  test: {
    name: "domain",
    environment: "node",
    globals: true,
    setupFiles: [],
    include: ["src/test/domain/**/*.test.ts"],
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
