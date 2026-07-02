// csv_loader.mjs - Node ESM loader hook for *.csv imports under tsx/Node.
//
// esbuild bundles `.csv` files as text via `--loader:.csv=text` at build
// time, but Node + tsx have no idea what to do with a `.csv` import at
// runtime. The browser bundle never hits this code path. We only need a
// loader hook for the Node-side test runner.
//
// Uses Node 22.5+ in-thread `registerHooks` API. The older `register()`
// API is deprecated (DEP0205). Pass this file via `node --import` so the
// hook installs before any test code runs.

import { registerHooks } from "node:module";
import fs from "node:fs";
import url from "node:url";

//============================================
// load(): called by Node's module loader for every resolved URL.
// We only intercept file:// URLs ending in `.csv`; everything else is
// passed through to the next loader.
registerHooks({
  load(specifier, context, nextLoad) {
    if (specifier.startsWith("file://") && specifier.endsWith(".csv")) {
      const filePath = url.fileURLToPath(specifier);
      const text = fs.readFileSync(filePath, "utf-8");
      const escaped = JSON.stringify(text);
      const source = `export default ${escaped};`;
      return {
        format: "module",
        source,
        shortCircuit: true,
      };
    }
    return nextLoad(specifier, context);
  },
});
