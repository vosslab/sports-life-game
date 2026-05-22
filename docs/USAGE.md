# Usage

Gridiron Life runs entirely in the browser as a single-page game. The
esbuild build produces a self-contained `dist/` directory (`index.html`,
`main.js`, `main.js.map`, `styles/`, `.nojekyll`) that can be served
locally or deployed straight to GitHub Pages. See
[docs/INSTALL.md](INSTALL.md) for one-time setup.

## Run the game

```bash
bash run_web_server.sh
```

This rebuilds via `build_github_pages.sh`, picks a random port (override
with `PORT=...`), opens your browser, and serves `dist/` over
`python3 -m http.server`. The random-port choice makes each run a fresh
browser origin, which sidesteps stale browser cache.

## Development workflow

```bash
npm run dev
```

Runs `esbuild --watch` so edits in `src/` rebuild `dist/main.js` on save
(no `--minify` in dev for readable output). Reload the browser to pick up
the new bundle. For a one-shot build use:

```bash
npm run build
```

The full pre-push gate is:

```bash
npm run check
```

This is an alias for `bash check_codebase.sh`. Useful flags (note these
are read by the shell script directly, so pass them through `bash` not
`npm`):

```bash
bash check_codebase.sh --fast              # skip Playwright + build
bash check_codebase.sh --skip-playwright   # keep build, skip Playwright only
```

## Tests

```bash
npm run test:node
```

Runs every `tests/test_*.ts` file under Node's built-in test runner
(`node --test`) with `tsx` loading TypeScript and a small ESM loader
hook (`tests/fixtures/csv_loader.mjs`) translating `.csv` text imports.

Useful node:test flags (place them before the file glob; passing them
through `npm run test:node -- <flag>` lands them after the script's file
list, where node ignores `--test-name-pattern`):

```bash
# Filter to a subset of tests by name (regex against the test() name)
node --test-name-pattern='rng' --import tsx --import ./tests/fixtures/csv_loader.mjs --test 'tests/test_*.ts'

# Re-run tests on file change
node --watch --import tsx --import ./tests/fixtures/csv_loader.mjs --test 'tests/test_*.ts'
```

For just the browser-driven smoke test, use `npm run test:playwright`.
For the full gate use `npm run check` as described above.

For end-to-end and browser-driven test conventions, see
[docs/E2E_TESTS.md](E2E_TESTS.md) and
[docs/PLAYWRIGHT_USAGE.md](PLAYWRIGHT_USAGE.md).

## Life Jump

Skip ahead to any phase of the career at a chosen age. This is useful for
testing different career phases and scenarios without playing through years
of weekly choices.

Two entry points reach the same code path:

- **URL parameter**: append `?life=<phase>&age=<n>&team=<id>` to the page
  URL. Parsed by [src/main.ts](../src/main.ts) before the save-load step,
  so Life Jump always wins over an existing save. The `?dev=` form is also
  accepted for backward compatibility. `team` is optional and NFL-only.
- **Life Jump button**: small fixed-position button in the bottom-right
  corner of every page. Opens a picker that builds the same URL above.

Valid `phase` values:

| Phase         | Age range |
| ------------- | --------- |
| `childhood`   | 1-13      |
| `high_school` | 14-17     |
| `college`     | 18-21     |
| `nfl`         | 22-39     |
| `legacy`      | 40+       |

Example:

```text
http://localhost:8080/?life=nfl&age=24
```

Implementation lives in [src/dev/dev_jump.ts](../src/dev/dev_jump.ts) and
[src/dev/dev_jump_ui.ts](../src/dev/dev_jump_ui.ts). Life Jump constructs
an in-memory `Player` only; it does not write to `localStorage` unless
you save manually. Regression coverage is in
[tests/test_dev_jump.ts](../tests/test_dev_jump.ts).

## More

- [docs/CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md): system design, components, and data flow
- [docs/FILE_STRUCTURE.md](FILE_STRUCTURE.md): directory layout and where to add new work
- [docs/PLUGIN_ARCHITECTURE.md](PLUGIN_ARCHITECTURE.md): plugin model and extension points
- [docs/ROADMAP.md](ROADMAP.md): planned work and priorities

## Known gaps

- Save data lives in browser `localStorage`. The schema is owned by
  [src/save/](../src/save/) (versioned envelope, `SAVE_KEY`, strict
  validation that returns `ok | reset | empty`); the exact storage key
  is `gridiron_life_save`. See
  [docs/CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md) for the save subsystem.
