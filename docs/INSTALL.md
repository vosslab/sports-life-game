# Installation

Gridiron Life is a single-page browser game written in TypeScript. The build
uses esbuild to bundle `src/*.ts` (plus embedded JSON and CSV data) into a
self-contained `dist/` artifact, served either locally or directly from
GitHub Pages. Setup means installing Node.js plus the npm devDependencies
and producing a first `dist/` build.

## Prerequisites

- Node.js and `npm` (TypeScript 5.4, tsx 4, esbuild 0.28, ESLint 10,
  Prettier 3, and Playwright 1.60 are pulled in via `package.json`
  devDependencies). On macOS, `brew install node` is the simplest path.
- Python 3.12 (optional, only for repo lint and audit scripts under `tests/`
  such as `tests/test_pyflakes_code_lint.py`). Not required to run or build
  the game.
- Playwright + chromium (optional, only for browser-based smoke tests under
  `tests/playwright/`).

## Setup

From the repo root:

```bash
bash devel/setup_typescript.sh
```

This runs `npm install` and then `./build_github_pages.sh`, which bundles
the TypeScript source via esbuild and produces a self-contained `dist/`
(`index.html`, `main.js`, `main.js.map`, `styles/`, `.nojekyll`). If you
prefer to drive the steps manually:

```bash
npm install
npm run build
```

## Playwright (optional, for browser tests)

```bash
bash devel/setup_playwright.sh
```

This installs `@playwright/test` as a devDependency and downloads chromium.
Skip it if you do not plan to run the browser-driven smoke tests.

## Verify the install

```bash
npm run check
```

This is an alias for `bash check_codebase.sh`, the smart orchestrator that
runs typecheck, lint, format check, the Node unit suite, the Playwright
smoke (if available), and the dist build. A successful run ends with a
`PASS:` summary line. Use `bash check_codebase.sh --fast` to skip
Playwright and build during tight iteration. See [docs/USAGE.md](USAGE.md)
for how to run the game itself.
