# File structure

## Top-level layout

```text
sports-life-game/
+- index.html              Single-page app shell (links src/styles/*.css, dist/main.js)
+- avatar_test.html        Standalone avatar preview page
+- package.json            Node project config (TypeScript dev dependency)
+- package-lock.json       npm dependency lockfile
+- tsconfig.json           TypeScript compiler settings (ES2020, strict, sourcemaps)
+- tsconfig.lint.json      Stricter TS config used by the lint/test runner
+- eslint.config.js        ESLint flat config for compiled JS output
+- pip_requirements.txt    Python runtime deps for tools/tests
+- pip_requirements-dev.txt Python dev deps (pytest, lint helpers)
+- pip_extras.txt          Optional Python extras
+- Brewfile                Homebrew packages
+- source_me.sh            Python environment bootstrap
+- setup_game.sh           One-time npm install and initial build
+- run_web_server.sh       Start local dev server (calls build_github_pages.sh)
+- build_github_pages.sh   Build dist/ via tsc and stage _site/ for Pages
+- check_codebase.sh       Type-check and run unit tests
+- AGENTS.md               Agent instructions and coding conventions
+- CLAUDE.md               Claude Code project pointers (imports docs/*)
+- README.md               Project overview and quick start
+- VERSION                 CalVer version string
+- LICENSE.LGPL_v3         LGPL v3 license (code)
+- LICENSE.CC_BY_4_0       CC BY 4.0 license (non-code content)
+- src/                    TypeScript source files
+- docs/                   Project documentation
+- tests/                  TS unit/integration tests + Python lint suite
+- tools/                  Simulation and analysis utilities
+- devel/                  Developer helpers (commit changelog, playwright setup)
+- dist/                   Compiled JS output (git-ignored)
+- _site/                  Staged GitHub Pages artifact (git-ignored)
+- node_modules/           npm dependencies (git-ignored)
+- .github/workflows/      GitHub Actions (deploy-pages.yml)
```

## Source directory

```text
src/
+- main.ts                 Bootstrap: load data, build context, wire game loop
+- player.ts               Player state model, stat helpers, identity fields
+- team.ts                 Team structure, conference, schedule, standings
+- ncaa.ts                 NCAA school CSV loader, conference assignment
+- nfl.ts                  NFL business logic (draft, retirement, HOF, legacy)
+- college.ts              College business logic (NIL, draft stock)
+- recruiting.ts           College recruiting and offer generation
+- recruiting_profile.ts   Persistent recruiting profile and star rating
+- season_arc.ts           Five-phase season arc (preseason..postseason)
+- crisis.ts               Midseason crisis system (0-2 per season)
+- activities.ts           Weekly activity options with phase filters
+- events.ts               Narrative event filter/select/apply
+- milestones.ts           One-time career story moments
+- weekly_choices.ts       Weekly choice menus driven by season arc
+- career_stats_view.ts    Career stat aggregation view helpers
+- tab_manager.ts          Centralized tab lifecycle and coordination
+- tabs.ts                 Tab navigation with phase-specific tab sets
+- theme.ts                Team color palettes and CSS theming
+- avatar.ts               SVG portrait generator (Avataaars-inspired)
+- stat_info.ts            Stat metadata (labels, tooltips, formatters)
+- team_emoji.ts           Team-to-emoji mapping for UI
+- popup.ts                Modal/interaction popup helpers
+- dom_utils.ts            Small DOM helpers used across widgets
+- game_loop.ts            Activities-tab refresh adapter (legacy weekly helpers)
+- week_sim.ts             Re-export shim; canonical impl under src/week_sim/
+- clutch_moment.ts        Re-export shim; canonical impl under src/clutch/
+- save.ts                 Re-export shim; canonical impl under src/save/
+- styles/                 CSS modules loaded by index.html
|  +- base.css             Reset, typography, color tokens
|  +- layout.css           App grid, dashboard, sidebar
|  +- buttons.css          Choice buttons, primary/secondary
|  +- modals.css           Popup card styles
|  +- tabs.css             Tab bar + panel styles
|  +- stats.css            Stat bars and value rows
|  +- story.css            Story-log layout and headlines
|  +- activities.css       Activities tab cards
|  +- phases.css           Phase-specific theming hooks
|  `- social.css           Fotomagic feed styles
+- core/                   Engine interfaces and registry
|  +- year_handler.ts      YearHandler, CareerContext, SeasonConfig interfaces
|  +- year_registry.ts     Age-to-handler map with overlap validation
|  +- year_runner.ts       Age advancement and handler dispatch
|  `- register_handlers.ts Boot-time registration of all 13 handlers
+- weekly/                 Weekly engine (split by cohesion, 2026-05)
|  +- weekly_engine.ts     Barrel exports for shared engine entry points
|  +- season_lifecycle.ts  startSeason / endSeason outer boundary
|  +- week_phases.ts       Focus -> activity -> event -> game phase loop
|  +- game_handler.ts      Per-week game orchestration
|  +- playoff_handler.ts   Playoff bracket advancement
|  `- engine_state.ts      Shared mutable engine state container
+- week_sim/               Per-game simulation tree
|  +- focus.ts             Season-goal stat updates and flavor pools
|  +- goals.ts             Goal catalog and activity-bias map
|  +- momentum.ts          Performance ratings, letter grades, decay
|  +- stat_lines.ts        Position StatLine generators, depth-chart scaling
|  +- game.ts              simulateGame orchestrator (legacy formula path)
|  +- depth_chart.ts       Weekly depth-chart evaluation
|  +- practice.ts          Practice reps for backups
|  `- index.ts             Barrel for the legacy shim
+- simulator/              Play-by-play simulator (newer engine)
|  +- adapter.ts           Bridge from week_sim to play-by-play simulator
|  +- engine/
|  |  +- game_engine.ts    Top-level game runner
|  |  +- state_machine.ts  Drive/down/possession state machine
|  |  `- rules_engine.ts   Apply rule set per league
|  +- models/
|  |  +- play_call_model.ts Offensive/defensive play selection
|  |  +- play_result_model.ts Yardage/turnover resolution
|  |  +- special_teams_model.ts FG/punt/kickoff resolution
|  |  `- team_strength_model.ts Ratings used by play resolution
|  +- rules/
|  |  +- league_rules.ts   Shared rule interface
|  |  +- ihsa_rules.ts     High-school rule variant
|  |  +- fcs_rules.ts      College FCS rules
|  |  +- nfl_rules.ts      NFL rules
|  |  `- league_tuning.ts  Per-league dial constants
|  +- output/
|  |  +- box_score.ts      Box-score aggregation
|  |  +- stat_line.ts      Player stat-line extraction
|  |  `- story_summary.ts  Narrative summary text
|  `- season/
|     `- standings.ts      Standings projection helpers
+- clutch/                 4Q clutch-moment engine (split from clutch_moment.ts)
|  +- types.ts             Public types, BASE_RATES, SCORING_MAPS
|  +- situation.ts         deriveSituation, scene/atmosphere, RNG helpers
|  +- choices_qb.ts        QB choice pool
|  +- choices_rb.ts        RB choice pool
|  +- choices_wr.ts        WR/TE choice pool
|  +- choices_ol.ts        OL/DL choice pool
|  +- choices_def.ts       Defender choice pool
|  +- choices_kicker.ts    Kicker/punter choice pool
|  +- resolve.ts           Pool selection, risk spread, resolution
|  `- index.ts             buildClutchMoment, resolveClutchMoment
+- season/                 Season layer (single source of truth)
|  +- season_types.ts      TeamId, GameId, GameStatus, StandingsRow, PlayoffSeed
|  +- team_model.ts        SeasonTeam class (identity, ratings)
|  +- game_model.ts        SeasonGame class (atomic result truth)
|  +- standings_model.ts   Pure standings derivation
|  +- season_model.ts      LeagueSeason class (teams, games, week)
|  +- season_builder.ts    Round-robin / non-conf schedule helpers
|  +- season_simulator.ts  Week advancement, non-player game sim
|  `- playoff_bracket.ts   HS / college / NFL playoff brackets
+- save/                   Versioned save (v1) with strict validation
|  +- schema.ts            CURRENT_SCHEMA_VERSION, SAVE_KEY, SaveEnvelope
|  +- validate.ts          validateRawSave: ok | reset | empty
|  `- index.ts             saveGame, loadGame, deleteSave, hasSave
+- view_state/             Simulation -> render contract
|  `- game_view_state.ts   GameViewState, HeaderView, StatBarView, CareerView
+- render/                 Pull-model render layer
|  `- story_log.ts         Collapsible age/week story-log DOM helpers
+- ui/                     Widget modules (split from monolithic ui.ts)
|  +- header_widget.ts     updateHeader, updateLifeStatus
|  +- stats_widget.ts      updateStatBar, updateAllStats, updateMiniStatStrip
|  +- story_widget.ts      clearStory, addHeadline, addText, addResult
|  +- choice_widget.ts     showChoices, showWeeklyFocusChoices, showGameResult
|  +- team_widget.ts       updateTeamTab
|  +- activities_widget.ts renderActivitiesTab
|  +- career_widget.ts     updateCareerTab, updateSeasonCareer
|  +- week_card_widget.ts  updateWeekCard, hideWeekCard, updateThisWeekPanel
|  +- sidebar_widget.ts    updateSidebar, showMilestoneCard
|  +- format_helpers.ts    formatStatKey, formatStatLine
|  `- index.ts             Barrel of all widgets
+- social/                 Fotomagic social feed
|  +- fotomagic.ts         Post prompts, popularity effects
|  `- feed_render.ts       Social tab rendering
+- player/                 Narrow Player type slices
|  +- identity.ts          PlayerIdentity, Position, PositionBucket, CareerPhase
|  +- stats.ts             CoreStats, CareerStats, HiddenStats
|  +- stats_bundle.ts      PlayerStatsBundle (nested grouping)
|  +- career.ts            PlayerCareer, SeasonRecord
|  +- season_state.ts      PlayerSeasonState, SeasonGoal
|  +- snapshot.ts          PlayerSnapshot (composed save/load type)
|  `- index.ts             Re-exports for narrow imports
+- shared/                 Cross-handler utilities
|  `- year_helpers.ts      Age-based stat drift, position assignment
+- childhood/              Childhood handlers (ages 1-13, no football)
|  +- kid_years.ts         Ages 1-7: BitLife-style events
|  +- peewee_years.ts      Ages 8-10: peewee football intro
|  +- travel_years.ts      Ages 11-13: travel team
|  +- character_creation.ts Name form and birth narrative
|  `- name_loader.ts       First/last name CSV loader with defaults
+- high_school/            HS handlers (ages 14-17, 10-week seasons)
|  +- hs_frosh_soph.ts     Ages 14-15: frosh/soph identity
|  +- hs_varsity.ts        Ages 16-17: varsity, driver license, stars
|  +- hs_season_builder.ts 8-team conference, 10-game schedule
|  `- recruiting_events.ts HS recruiting story events
+- college/                College handlers (ages 18-21, 12-week seasons)
|  +- college_entry.ts     Age 18: freshman, redshirt
|  +- college_core.ts      Ages 19-20: junior early-declaration option
|  +- college_senior.ts    Age 21: graduation, mandatory declaration
|  `- college_season_builder.ts Season from NCAA CSV (FBS/FCS)
+- nfl_handlers/           NFL handlers (ages 22-39, 17-week seasons)
|  +- nfl_rookie.ts        Age 22: rookie year
|  +- nfl_early.ts         Ages 23-26: early career
|  +- nfl_peak.ts          Ages 27-31: peak years
|  +- nfl_veteran.ts       Ages 32-36: retirement option
|  +- nfl_late.ts          Ages 37-39: forced retirement check
|  `- nfl_season_builder.ts 32-team NFL, 8 divisions, 17 games
+- legacy/                 Career end-of-life flow
|  `- retirement.ts        Hall of Fame check, career summary, restart
`- data/                   Static data files
   +- avatar_parts.ts      SVG part definitions and color palettes
   +- positions.json       Position config (stat weights, sizes, outputs)
   +- teams.json           Team name pools (NFL, Power 5, G5, FCS)
   +- names.json           Static name reference data
   +- crises.json + crises.ts  Midseason crisis catalog and loader
   +- first_names.csv      First name pool
   +- last_names.csv       Last name pool
   +- ru_first_names.csv   Russian first names
   +- ru_last_names.csv    Russian last names
   +- ncaa_schools-FBS.csv FBS schools with conferences
   +- ncaa_schools-FCS.csv FCS schools with conferences
   +- nfl_teams.csv        NFL team roster
   +- events/              Phase event libraries (childhood_1..9, youth, high_school, college, nfl)
   `- choices/             Per-arc weekly-choice catalogs
      +- preseason.{json,ts}
      +- opening.{json,ts}
      +- midseason.{json,ts}
      +- stretch.{json,ts}
      `- postseason.{json,ts}
```

## Tests and tools

```text
tests/
+- run.ts                  TS unit test runner (used by check_codebase.sh)
+- autoplay.mjs            Headless autoplay smoke driver
+- smoke.sh                Shell wrapper for smoke runs
+- test_*.ts               TS tests (handler registry, player helpers, RNG, simulator)
+- check_dom_imports.ts    Boundary check: core code must not import DOM
+- check_math_random_budget.ts  Static budget on Math.random usage
+- test_*.py               Python lint/compliance tests (pyflakes, ASCII, imports)
+- conftest.py             pytest config
+- git_file_utils.py       Repo-root helper used by Python tests
`- playwright/             Browser-driven Playwright tests

tools/
+- sim_player_season.ts    Standalone single-player season simulator
+- sim_conference_season.ts Conference simulation harness
+- sim_distribution.ts     Output distribution diagnostics
+- sim_positions.ts        Per-position stat distribution
+- sim_conf/               Conference sim configs
`- extract_avataaars.py    Pull Avataaars parts into avatar_parts.ts

devel/
+- commit_changelog.py     Helper for staging changelog edits before commit
`- setup_playwright.sh     One-time Playwright + chromium install
```

## Documentation map

### Game design

- [docs/BITLIFE_GAME_SPEC.md](docs/BITLIFE_GAME_SPEC.md)
- [docs/THE_SHOW_GAME_SPEC.md](docs/THE_SHOW_GAME_SPEC.md)
- [docs/AGE_PROGRESSION.md](docs/AGE_PROGRESSION.md)
- [docs/PORTRAIT_SYSTEM.md](docs/PORTRAIT_SYSTEM.md)

### Project management

- [docs/CHANGELOG.md](docs/CHANGELOG.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/TODO.md](docs/TODO.md)
- [docs/IDEAS_LIST.md](docs/IDEAS_LIST.md)
- [docs/AUTOPLAY_FINDINGS.md](docs/AUTOPLAY_FINDINGS.md)

### Developer reference

- [docs/CODE_ARCHITECTURE.md](docs/CODE_ARCHITECTURE.md)
- [docs/E2E_TESTS.md](docs/E2E_TESTS.md)
- [docs/PLAYWRIGHT_USAGE.md](docs/PLAYWRIGHT_USAGE.md)
- [docs/AUTHORS.md](docs/AUTHORS.md)

### Style guides

- [docs/TYPESCRIPT_STYLE.md](docs/TYPESCRIPT_STYLE.md)
- [docs/PYTHON_STYLE.md](docs/PYTHON_STYLE.md)
- [docs/PYTEST_STYLE.md](docs/PYTEST_STYLE.md)
- [docs/REPO_STYLE.md](docs/REPO_STYLE.md)
- [docs/MARKDOWN_STYLE.md](docs/MARKDOWN_STYLE.md)
- [docs/CLAUDE_HOOK_USAGE_GUIDE.md](docs/CLAUDE_HOOK_USAGE_GUIDE.md)

## Generated artifacts

| Artifact | Location | Git-ignored |
| --- | --- | --- |
| Compiled JS + maps | `dist/` | YES |
| Staged Pages artifact | `_site/` | YES |
| npm packages | `node_modules/` | YES |
| Game screenshots | `game_screenshots/` | YES |

## Where to add new work

- **New age bands**: implement `YearHandler` in the right phase subdirectory, register in [src/core/register_handlers.ts](src/core/register_handlers.ts).
- **New events**: add JSON entries under [src/data/events/](src/data/events/) and let [src/events.ts](src/events.ts) auto-filter.
- **New positions**: extend `Position` in [src/player/identity.ts](src/player/identity.ts), add a StatLine in [src/week_sim/stat_lines.ts](src/week_sim/stat_lines.ts), and add a clutch pool in [src/clutch/](src/clutch/) if a new bucket.
- **Play-by-play rules**: add a rule module under [src/simulator/rules/](src/simulator/rules/) and wire it in via the league rules interface.
- **Shared logic**: add to [src/shared/](src/shared/) for cross-handler utilities.
- **UI widgets**: add a focused module under [src/ui/](src/ui/) and re-export from [src/ui/index.ts](src/ui/index.ts).
- **Render layer**: extend [src/render/render_state.ts](src/render/render_state.ts) if adding a new `GameViewState` slice.
- **Styles**: add or extend a CSS module under [src/styles/](src/styles/) and link it from [index.html](index.html).
- **Tests**: TS tests as `tests/test_*.ts` (TS) or `tests/test_*.py` (Python lint/compliance).
- **Tools**: standalone analysis scripts under `tools/`.
- **Documentation**: under `docs/` using SCREAMING_SNAKE_CASE.

## Known gaps

- [docs/college_football_recruiting_bitlife_sim_design.md](docs/college_football_recruiting_bitlife_sim_design.md) violates the SCREAMING_SNAKE_CASE rule from [docs/REPO_STYLE.md](docs/REPO_STYLE.md). Rename via `git mv` before next docs pass.
- `docs/superpowers/` and `docs/archive/` are project artifact directories; verify whether they should remain under `docs/` or move to `tools/` / a separate planning directory.
