# Gridiron Life

A BitLife-style American football career simulator. Play through a complete life arc
from childhood to NFL retirement, making choices that shape your player's career,
stats, and legacy. Built as a single-page browser game in TypeScript.

Play it live: [vosslab.github.io/sports-life-game](https://vosslab.github.io/sports-life-game/)

## Quick start

```bash
bash devel/setup_typescript.sh
```

This runs `npm install` and an initial build. If you prefer to drive the steps
manually:

```bash
npm install
npm run build
```

The build emits a self-contained `dist/` (the same artifact that ships to
GitHub Pages: `index.html`, `main.js`, `main.js.map`, `styles/`, `.nojekyll`).
To serve `dist/` locally on a random port and open it in your browser, run:

```bash
bash run_web_server.sh
```

For live development with auto-recompile (esbuild watch mode):

```bash
npm run dev
```

## Testing

```bash
npm run check
```

`npm run check` (alias for `bash check_codebase.sh`) is the canonical pre-push
gate. It runs typecheck, lint, format check, Node tests, Playwright smoke
tests (if available), and the dist build. Useful flags:

```bash
bash check_codebase.sh --fast              # skip Playwright + build
bash check_codebase.sh --skip-playwright   # keep build, skip Playwright only
```

For just the Node unit suite, use `npm run test:node`. For just the browser
smoke test, `npm run test:playwright`.

## Documentation

### Game design

- [docs/BITLIFE_GAME_SPEC.md](docs/BITLIFE_GAME_SPEC.md): BitLife-inspired game design spec
- [docs/THE_SHOW_GAME_SPEC.md](docs/THE_SHOW_GAME_SPEC.md): MLB The Show design reference
- [docs/AGE_PROGRESSION.md](docs/AGE_PROGRESSION.md): age and life phase progression system
- [docs/PORTRAIT_SYSTEM.md](docs/PORTRAIT_SYSTEM.md): avatar and portrait system

### Developer reference

- [docs/CODE_ARCHITECTURE.md](docs/CODE_ARCHITECTURE.md): system design, components, and data flow
- [docs/FILE_STRUCTURE.md](docs/FILE_STRUCTURE.md): directory layout and where to add new work
- [docs/PLUGIN_ARCHITECTURE.md](docs/PLUGIN_ARCHITECTURE.md): plugin model and extension points
- [docs/CHANGELOG.md](docs/CHANGELOG.md): chronological record of changes
- [docs/ROADMAP.md](docs/ROADMAP.md): planned work and priorities
- [docs/TODO.md](docs/TODO.md): backlog scratchpad
- [docs/IDEAS_LIST.md](docs/IDEAS_LIST.md): feature ideas and brainstorming

### Style guides

- [docs/TYPESCRIPT_STYLE.md](docs/TYPESCRIPT_STYLE.md): TypeScript conventions for this repo
- [docs/REPO_STYLE.md](docs/REPO_STYLE.md): repo-wide organization and naming rules

## Status

Experimental. The full career arc (childhood through NFL retirement) is playable.
See [docs/ROADMAP.md](docs/ROADMAP.md) for what is planned next.

## License

See [LICENSE.LGPL_v3](LICENSE.LGPL_v3) for code licensing terms.

## Maintainer

Neil Voss, https://bsky.app/profile/neilvosslab.bsky.social
