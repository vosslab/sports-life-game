// eslint.config.local.js - consumer-owned ESLint overrides.
//
// Add repo-specific ESLint config objects here: extra browser-context globs,
// per-tool globals, or local rule tweaks. This file ships once via the noexist
// bucket and is never overwritten by propagation, so your edits survive. The
// canonical eslint.config.js imports and spreads this array AFTER its own config,
// so entries here refine or override the canonical rules.
//
// Example: give two named node tools browser globals for page.evaluate() use,
// without loosening no-undef across all tools.
//
//   import globals from "globals";
//   export default [
//     {
//       files: ["tools/scene_to_png.mjs", "tools/svg_picker/**"],
//       languageOptions: { globals: { ...globals.browser } },
//     },
//   ];
//
// _site/ is esbuild build output (gitignored, wiped by dist_clean.sh) and
// archive/disconnected_features/ is committed-but-inactive code excluded from
// both tsconfig.json and tsconfig.lint.json. Neither belongs to a tsconfig
// project, so typescript-eslint's type-checked rules cannot resolve them.
// Mirror the tsconfig excludes here so lint matches typecheck scope.
export default [
  {
    ignores: ["_site/**", "archive/**"],
  },
  {
    // docs/TYPESCRIPT_STYLE.md documents no-console as "warn only, do not fail
    // builds" (user decision). check_codebase.sh runs eslint with
    // --max-warnings 0, which would turn that warn into a hard gate failure.
    // Remaining console use here is intentional: CLI simulator output under
    // tools/, error-path diagnostics (console.warn/error) in src/, and test
    // logging. Turn the rule off so the documented decision holds under the
    // zero-warning gate.
    files: ["**/*.{ts,tsx,mts,cts,js,mjs,cjs}"],
    rules: {
      "no-console": "off",
    },
  },
];
