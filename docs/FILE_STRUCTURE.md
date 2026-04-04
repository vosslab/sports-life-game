# File structure

## Top-level layout

```text
sports-life-game/
+- index.html           Single-page app shell
+- styles.css           Global stylesheet
+- package.json         Node project config (TypeScript dev dependency)
+- tsconfig.json        TypeScript compiler settings (ES2020, strict, sourcemaps)
+- AGENTS.md            Agent instructions and coding conventions
+- README.md            Project overview and quick start
+- LICENSE              GPL-3.0
+- src/                 TypeScript source files
+- docs/                Project documentation
+- dist/                Compiled JS output (git-ignored)
+- node_modules/        npm dependencies (git-ignored)
+- tools/               Build and extraction utilities
```

## Source directory

```text
src/
+- main.ts              Entry point: character creation, phase transitions, save/load
+- game_loop.ts         Shared weekly rhythm engine for all football phases
+- player.ts            Player state model, stat types, creation and modification
+- team.ts              Team structure, conference, schedule, standings
+- week_sim.ts          Game simulation, focus effects, performance ratings
+- activities.ts        Weekly activity system with unlockable options
+- events.ts            Narrative event filtering, selection, and application
+- save.ts              Browser localStorage persistence
+- hs_phase.ts          High school phase runner (4 seasons)
+- college_phase.ts     College phase runner (up to 4 seasons)
+- college.ts           College logic (NIL, draft stock, season sim)
+- nfl_phase.ts         NFL phase runner (draft through retirement)
+- nfl.ts               NFL logic (draft, season, Hall of Fame, legacy)
+- recruiting.ts        College recruiting and offer generation
+- ncaa.ts              NCAA school data loading and assignment
+- ui.ts                DOM rendering, stat bars, modals, story log
+- tabs.ts              Tab navigation with phase-specific tab sets
+- theme.ts             Team color palettes and dynamic CSS theming
+- avatar.ts            SVG portrait generator (Avataaars-inspired)
`- data/                Static data files
   +- avatar_parts.ts   SVG part definitions and color palettes
   +- positions.json    Position config (stat weights, ideal sizes, outputs)
   +- events.json       Narrative event library (conditions, choices, effects)
   +- teams.json        Team name lists (NFL, Power 5, G5, FCS)
   +- names.json        Static name reference data
   +- first_names.csv   First name pool for character generation
   +- last_names.csv    Last name pool for character generation
   +- ncaa_schools-FBS.csv  FBS school roster with conferences
   `- ncaa_schools-FCS.csv  FCS school roster with conferences
```

## Documentation map

- [docs/CHANGELOG.md](docs/CHANGELOG.md): chronological record of changes
- [docs/ROADMAP.md](docs/ROADMAP.md): planned work and priorities
- [docs/TODO.md](docs/TODO.md): backlog scratchpad
- [docs/IDEAS_LIST.md](docs/IDEAS_LIST.md): feature brainstorming
- [docs/CODE_ARCHITECTURE.md](docs/CODE_ARCHITECTURE.md): system design and data flow
- [docs/BITLIFE_GAME_SPEC.md](docs/BITLIFE_GAME_SPEC.md): BitLife-inspired game design spec
- [docs/THE_SHOW_GAME_SPEC.md](docs/THE_SHOW_GAME_SPEC.md): MLB The Show design reference
- [docs/TYPESCRIPT_STYLE.md](docs/TYPESCRIPT_STYLE.md): TypeScript conventions
- [docs/PYTHON_STYLE.md](docs/PYTHON_STYLE.md): Python conventions (for tools)
- [docs/REPO_STYLE.md](docs/REPO_STYLE.md): repo-wide organization rules
- [docs/MARKDOWN_STYLE.md](docs/MARKDOWN_STYLE.md): Markdown formatting rules

## Generated artifacts

| Artifact | Location | Git-ignored |
| --- | --- | --- |
| Compiled JS | `dist/` | YES |
| npm packages | `node_modules/` | YES |
| Source maps | `dist/*.js.map` | YES |

## Where to add new work

- **Game logic**: add to existing phase modules or create new ones in `src/`
- **New events**: add entries to [src/data/events.json](src/data/events.json)
- **New positions**: update [src/player.ts](src/player.ts) types and
  [src/week_sim.ts](src/week_sim.ts) simulation
- **UI components**: extend [src/ui.ts](src/ui.ts)
- **Documentation**: add to `docs/` using ALL CAPS naming
- **Build tools**: add to `tools/`
