# File structure

## Top-level layout

```text
sports-life-game/
+- index.html           Single-page app shell
+- styles.css           Global stylesheet
+- package.json         Node project config (TypeScript dev dependency)
+- tsconfig.json        TypeScript compiler settings (ES2020, strict, sourcemaps)
+- eslint.config.js     ESLint flat config for compiled JS output
+- run_game.sh          Build and launch game in browser
+- source_me.sh         Python environment bootstrap
+- AGENTS.md            Agent instructions and coding conventions
+- README.md            Project overview and quick start
+- VERSION              CalVer version string
+- LICENSE.LGPL_v3      LGPL v3 license (code)
+- LICENSE.CC_BY_4_0    CC BY 4.0 license (non-code content)
+- src/                 TypeScript source files
+- docs/                Project documentation
+- tests/               Python test suite (lint, compliance)
+- tools/               Build and extraction utilities
+- devel/               Development helpers
+- dist/                Compiled JS output (git-ignored)
+- node_modules/        npm dependencies (git-ignored)
```

## Source directory

```text
src/
+- main.ts              Entry point: character creation, phase transitions, save/load
+- player.ts            Player state model, stat types, identity fields
+- team.ts              Team structure, conference, schedule, standings
+- week_sim.ts          Game simulation, focus effects, performance ratings
+- activities.ts        Weekly activity system with unlockable options
+- events.ts            Narrative event filtering, selection, and application
+- save.ts              Browser localStorage persistence with migration
+- game_loop.ts         Shared weekly rhythm engine (legacy, being replaced)
+- hs_phase.ts          High school phase runner (legacy)
+- college_phase.ts     College phase runner (legacy)
+- college.ts           College logic (NIL, draft stock, declaration)
+- nfl_phase.ts         NFL phase runner (legacy)
+- nfl.ts               NFL logic (draft, retirement, Hall of Fame, legacy)
+- recruiting.ts        College recruiting and offer generation
+- ncaa.ts              NCAA school data loading and assignment
+- ui.ts                DOM rendering, stat bars, modals, story log
+- tabs.ts              Tab navigation with phase-specific tab sets
+- theme.ts             Team color palettes and dynamic CSS theming
+- avatar.ts            SVG portrait generator (Avataaars-inspired)
+- core/                Core engine interfaces and registry
|  +- year_handler.ts   Handler contract, CareerContext, SeasonConfig interfaces
|  +- year_registry.ts  Age-to-handler mapping with overlap validation
|  +- year_runner.ts    Age advancement and handler dispatch
|  `- register_handlers.ts  Boot-time registration of all 13 handlers
+- weekly/              Weekly game engine
|  `- weekly_engine.ts  Shared weekly loop with guaranteed advancement
+- shared/              Cross-handler utilities
|  `- year_helpers.ts   Age-based stat drift curves, position assignment
+- childhood/           Childhood handlers (ages 1-13)
|  +- kid_years.ts      Ages 1-7: BitLife-style events, no football
|  +- peewee_years.ts   Ages 8-10: peewee football, town identity
|  `- travel_years.ts   Ages 11-13: travel team
+- high_school/         High school handlers (ages 14-17)
|  +- hs_frosh_soph.ts  Ages 14-15: frosh/soph, HS identity generation
|  `- hs_varsity.ts     Ages 16-17: varsity, driver license, recruiting
+- college/             College handlers (ages 18-21)
|  +- college_entry.ts  Age 18: freshman, redshirt support
|  +- college_core.ts   Ages 19-20: early declaration option
|  `- college_senior.ts Age 21: graduation, mandatory draft
+- nfl_handlers/        NFL handlers (ages 22-39)
|  +- nfl_rookie.ts     Age 22: rookie salary
|  +- nfl_early.ts      Ages 23-26: salary based on depth chart
|  +- nfl_peak.ts       Ages 27-31: peak salary
|  +- nfl_veteran.ts    Ages 32-36: retirement option, decline
|  `- nfl_late.ts       Ages 37-39: forced retirement check
`- data/                Static data files
   +- avatar_parts.ts   SVG part definitions and color palettes
   +- positions.json    Position config (stat weights, ideal sizes, outputs)
   +- events.json       Narrative event library (conditions, choices, effects)
   +- teams.json        Team name lists (NFL, Power 5, G5, FCS)
   +- names.json        Static name reference data
   +- first_names.csv   First name pool for character generation
   +- last_names.csv    Last name pool for character generation
   +- ru_first_names.csv  Russian first name pool
   +- ru_last_names.csv   Russian last name pool
   +- ncaa_schools-FBS.csv  FBS school roster with conferences
   `- ncaa_schools-FCS.csv  FCS school roster with conferences
```

## Documentation map

### Game design

- [docs/BITLIFE_GAME_SPEC.md](docs/BITLIFE_GAME_SPEC.md): BitLife-inspired game design spec
- [docs/THE_SHOW_GAME_SPEC.md](docs/THE_SHOW_GAME_SPEC.md): MLB The Show design reference
- [docs/AGE_PROGRESSION.md](docs/AGE_PROGRESSION.md): age and life phase progression system
- [docs/PORTRAIT_SYSTEM.md](docs/PORTRAIT_SYSTEM.md): avatar and portrait system

### Project management

- [docs/CHANGELOG.md](docs/CHANGELOG.md): chronological record of changes
- [docs/ROADMAP.md](docs/ROADMAP.md): planned work and priorities
- [docs/TODO.md](docs/TODO.md): backlog scratchpad
- [docs/IDEAS_LIST.md](docs/IDEAS_LIST.md): feature brainstorming

### Developer reference

- [docs/CODE_ARCHITECTURE.md](docs/CODE_ARCHITECTURE.md): system design and data flow
- [docs/AUTHORS.md](docs/AUTHORS.md): primary maintainers and contributors

### Style guides

- [docs/TYPESCRIPT_STYLE.md](docs/TYPESCRIPT_STYLE.md): TypeScript conventions
- [docs/PYTHON_STYLE.md](docs/PYTHON_STYLE.md): Python conventions (for tools and tests)
- [docs/REPO_STYLE.md](docs/REPO_STYLE.md): repo-wide organization rules
- [docs/MARKDOWN_STYLE.md](docs/MARKDOWN_STYLE.md): Markdown formatting rules

## Generated artifacts

| Artifact | Location | Git-ignored |
| --- | --- | --- |
| Compiled JS | `dist/` | YES |
| npm packages | `node_modules/` | YES |
| Source maps | `dist/*.js.map` | YES |

## Where to add new work

- **New age bands**: create a handler implementing `YearHandler` in the appropriate
  subdirectory, register it in [src/core/register_handlers.ts](src/core/register_handlers.ts)
- **New events**: add entries to [src/data/events.json](src/data/events.json)
- **New positions**: update [src/player.ts](src/player.ts) types and
  [src/week_sim.ts](src/week_sim.ts) simulation
- **Shared logic**: add to [src/shared/](src/shared/) for cross-handler utilities
- **UI components**: extend [src/ui.ts](src/ui.ts)
- **Documentation**: add to `docs/` using ALL CAPS naming
- **Tests**: add to `tests/` with `test_` prefix
- **Build tools**: add to `tools/`
