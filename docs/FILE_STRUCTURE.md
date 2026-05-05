# File structure

## Top-level layout

```text
sports-life-game/
+- index.html           Single-page app shell
+- styles.css           Global stylesheet
+- package.json         Node project config (TypeScript dev dependency)
+- tsconfig.json        TypeScript compiler settings (ES2020, strict, sourcemaps)
+- eslint.config.js     ESLint flat config for compiled JS output
+- run_web_server.sh    Start local dev server (calls build_github_pages.sh)
+- build_github_pages.sh Build dist/ via tsc (canonical compile step)
+- setup_game.sh        One-time npm install and initial build
+- setup_playwright.sh   One-time Playwright + chromium install (optional)
+- check_codebase.sh    Type-check and run unit tests
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
+- player.ts            Player state model, stat types, identity fields, avatar config
+- team.ts              Team structure, conference, schedule, standings
+- week_sim.ts          Re-export shim; canonical impl under src/week_sim/ (M4)
+- week_sim/             Modular weekly simulation tree (M4 split)
|  +- focus.ts          Season-goal weekly stat updates and flavor pools
|  +- goals.ts          GoalInfo, getGoalsForPhase, activity-preference map
|  +- momentum.ts       updateMomentum, performance ratings, letter grades
|  +- stat_lines.ts     Per-position StatLine generators, depth-chart scaling
|  +- game.ts           simulateGame: performance, score, narrative
|  +- depth_chart.ts    evaluateDepthChartUpdate (week-to-week promotions)
|  +- practice.ts       runPracticeSession for backups/bench
|  `- index.ts          Barrel re-exports for the legacy shim
+- clutch_moment.ts     Re-export shim; canonical impl under src/clutch/ (M4)
+- clutch/               4Q clutch-moment engine (M4 split)
|  +- types.ts          Public types, BASE_RATES, SCORING_MAPS
|  +- situation.ts      deriveSituation, scene/atmosphere, RNG helpers
|  +- choices_qb.ts     QB choice pool (situation-tagged narrative variants)
|  +- choices_rb.ts     RB choice pool
|  +- choices_wr.ts     WR/TE choice pool
|  +- choices_ol.ts     OL/DL choice pool
|  +- choices_def.ts    Defender choice pool
|  +- choices_kicker.ts Kicker/punter choice pool
|  +- resolve.ts        Pool selection, risk spread, success/failure resolution
|  `- index.ts          buildClutchMoment, resolveClutchMoment
+- activities.ts        Weekly activity system with unlockable options
+- events.ts            Narrative event filtering, selection, and application
+- milestones.ts        One-time career story moments (18 total across HS/college/NFL)
+- save.ts              Re-export shim; canonical impl in src/save/
+- save/                 Versioned save (v1) with strict validation
|  +- schema.ts          CURRENT_SCHEMA_VERSION, SAVE_KEY, SaveEnvelope
|  +- validate.ts        validateRawSave: ok | reset | empty
|  `- index.ts           saveGame, loadGame, deleteSave, hasSave (no migrators)
+- player/               Narrow Player type slices (M2)
|  +- identity.ts        PlayerIdentity, Position, PositionBucket, CareerPhase
|  +- stats.ts           CoreStats, CareerStats, HiddenStats
|  +- stats_bundle.ts    PlayerStatsBundle (nested stat-object grouping; M3)
|  +- career.ts          PlayerCareer, SeasonRecord
|  +- season_state.ts    PlayerSeasonState, SeasonGoal
|  +- snapshot.ts        PlayerSnapshot (composed save/load type)
|  `- index.ts           Re-exports for narrow imports
+- view_state/           Simulation -> render contract (M2; lands ahead of M5)
|  `- game_view_state.ts GameViewState, HeaderView, StatBarView, CareerView
+- render/              Pull-model render layer (M5)
|  +- render_state.ts   renderState(view: GameViewState), clearRenderCache()
|  `- story_log.ts      Collapsible age/week story-log DOM helpers (M6)
+- ui/                  Widget modules, split from monolithic ui.ts (M5)
|  +- header_widget.ts  updateHeader, updateLifeStatus
|  +- stats_widget.ts   updateStatBar, updateAllStats, updateMiniStatStrip, updateStatsTab
|  +- story_widget.ts   clearStory, addHeadline, addText, addResult, addStatChange, showRecentChange
|  +- choice_widget.ts  ChoiceOption type, showChoices, clearChoices, showWeeklyFocusChoices, showGameResult
|  +- team_widget.ts    updateTeamTab
|  +- activities_widget.ts renderActivitiesTab
|  +- career_widget.ts  updateCareerTab, updateSeasonCareer (large module)
|  +- week_card_widget.ts updateWeekCard, hideWeekCard, updateThisWeekPanel
|  +- sidebar_widget.ts updateSidebar, showMilestoneCard
|  +- format_helpers.ts formatStatKey, formatStatLine
|  `- index.ts          Barrel re-export of all widgets + popup functions
+- game_loop.ts         Activities-tab refresh adapter (legacy weekly helpers; retired in M5)
+- college.ts           College logic (NIL, draft stock, declaration)
+- nfl.ts               NFL logic (draft, retirement, Hall of Fame, legacy)
+- recruiting.ts        College recruiting and offer generation
+- ncaa.ts              NCAA school data loading and assignment
+- tabs.ts              Tab navigation with phase-specific tab sets
+- tab_manager.ts       Centralized tab lifecycle and coordination
+- theme.ts             Team color palettes and dynamic CSS theming
+- avatar.ts            SVG portrait generator (Avataaars-inspired, age-aware)
+- core/                Core engine interfaces and registry
|  +- year_handler.ts   Handler contract, CareerContext, SeasonConfig interfaces
|  +- year_registry.ts  Age-to-handler mapping with overlap validation
|  +- year_runner.ts    Age advancement and handler dispatch
|  `- register_handlers.ts  Boot-time registration of all 13 handlers
+- weekly/              Weekly game engine
|  `- weekly_engine.ts  Shared weekly loop with guaranteed advancement
+- season/              Season simulation layer (source of truth)
|  +- season_types.ts   Shared types: TeamId, GameId, StandingsRow
|  +- team_model.ts     SeasonTeam class (identity, ratings, no record)
|  +- game_model.ts     SeasonGame class (atomic truth for results)
|  +- standings_model.ts  Pure standings derivation from finalized games
|  +- season_model.ts   LeagueSeason class (owns teams, games, week, standings)
|  +- season_builder.ts Shared schedule helpers (round-robin, validation)
|  +- season_simulator.ts  Week advancement, non-player game simulation
|  `- playoff_bracket.ts  Generic bracket for HS, college, NFL playoffs
+- shared/              Cross-handler utilities
|  `- year_helpers.ts   Age-based stat drift curves, position assignment
+- childhood/           Childhood handlers (ages 1-13, no football)
|  +- kid_years.ts      Ages 1-7: BitLife-style events, narrative only
|  +- peewee_years.ts   Ages 8-10: peewee football intro, town generation
|  +- travel_years.ts   Ages 11-13: travel team competitions
|  +- character_creation.ts  Name input form and birth narrative (M6)
|  `- name_loader.ts    First/last name CSV loader with defaults (M6)
+- legacy/              Career end-of-life flow (M6)
|  `- retirement.ts     Hall of Fame check, career summary, restart
+- high_school/         High school handlers (ages 14-17, 10-week seasons)
|  +- hs_frosh_soph.ts  Ages 14-15: frosh/soph, HS identity generation
|  +- hs_varsity.ts     Ages 16-17: varsity, driver license, recruiting stars
|  `- hs_season_builder.ts  Build 8-team HS season, round-robin conference
+- college/             College handlers (ages 18-21, 12-week seasons)
|  +- college_entry.ts  Age 18: freshman, redshirt option, transfer portal
|  +- college_core.ts   Ages 19-20: early declaration option (juniors)
|  +- college_senior.ts Age 21: graduation, mandatory draft declaration
|  `- college_season_builder.ts  Build season from NCAA school data (FBS/FCS)
+- nfl_handlers/        NFL handlers (ages 22-39, 17-week seasons)
|  +- nfl_rookie.ts     Age 22: rookie year, salary, intro narrative
|  +- nfl_early.ts      Ages 23-26: salary based on depth chart position
|  +- nfl_peak.ts       Ages 27-31: peak earning years, legacy building
|  +- nfl_veteran.ts    Ages 32-36: retirement option, decline tracking
|  +- nfl_late.ts       Ages 37-39: forced retirement check, farewell
|  `- nfl_season_builder.ts  Build 32-team NFL season with divisions
`- data/                Static data files (JSON and CSV)
   +- avatar_parts.ts   SVG part definitions and color palettes (TS module)
   +- positions.json    Position config (stat weights, ideal sizes, outputs)
   +- events.json       Narrative event library (150+ events across all phases)
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
  [src/week_sim/stat_lines.ts](src/week_sim/stat_lines.ts) for the
  position-specific stat line, plus [src/clutch/](src/clutch/) if a new
  bucket needs its own clutch choice pool
- **Shared logic**: add to [src/shared/](src/shared/) for cross-handler utilities
- **UI widgets**: add to [src/ui/](src/ui/) with a focused widget module;
  re-export from [src/ui/index.ts](src/ui/index.ts) for callers
- **Render layer**: extend [src/render/render_state.ts](src/render/render_state.ts)
  if adding new GameViewState slices or optimizing dirty-flag logic
- **Documentation**: add to `docs/` using ALL CAPS naming
- **Tests**: add to `tests/` with `test_` prefix
- **Build tools**: add to `tools/`
