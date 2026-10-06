/**
 * The one browser global the domain is allowed to reach for.
 *
 * `tsconfig.domain.json` compiles the domain with no DOM lib and no ambient
 * types, which is what proves it would load on a JavaScript runtime with no
 * browser. Hermes - React Native's engine - provides `console`, so declaring
 * it here keeps that guard honest without pulling in @types/node, which would
 * quietly readmit a great deal else along with it.
 */
declare const console: {
  log(...data: unknown[]): void;
  info(...data: unknown[]): void;
  warn(...data: unknown[]): void;
  error(...data: unknown[]): void;
};
