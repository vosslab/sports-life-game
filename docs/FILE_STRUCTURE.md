# File structure

## Top-level layout

```text
sports-life-game/
+- avatar_test.html        Standalone avatar preview page
+- package.json            Node project config + npm script graph
+- package-lock.json       npm dependency lockfile
+- tsconfig.json           TypeScript compiler settings (ES2020, strict, sourcemaps)
+- tsconfig.lint.json      Stricter TS config used by the lint/test runner
+- eslint.config.js        ESLint flat config (ignores dist/, archive/, _site/, etc.)
+- .prettierrc.json        Prettier config (tabs, single quotes, 100-char width)
+- .prettierignore         Prettier ignore list (dist/, node_modules/, archive/, etc.)
+- pip_requirements.txt    Python runtime deps for tools/tests
+- pip_requirements-dev.txt Python dev deps (pytest, lint helpers)
+- pip_extras.txt          Optional Python extras
+- Brewfile                Homebrew packages
+- source_me.sh            Python environment bootstrap
+- run_web_server.sh       Rebuild dist/ + serve on a random port
+- build_github_pages.sh   esbuild bundler that produces self-contained dist/
+- check_codebase.sh       Smart orchestrator wrapping npm scripts (--fast, --skip-playwright)
+- AGENTS.md               Agent instructions and coding conventions
+- CLAUDE.md               Claude Code project pointers (imports docs/*)
+- README.md               Project overview and quick start
+- VERSION                 CalVer version string
+- LICENSE.LGPL_v3         LGPL v3 license (code)
+- src/                    TypeScript source files (includes src/index.html)
+- docs/                   Project documentation
+- tests/                  TS unit/integration tests + Python lint suite
+- tools/                  Simulation and analysis utilities
+- devel/                  Developer helpers (setup_typescript.sh, setup_playwright.sh, commit_changelog.py)
+- archive/                Disconnected features and experimental modules
+- dist/                   Self-contained build output (git-ignored)
+- node_modules/           npm dependencies (git-ignored)
+- .github/workflows/      GitHub Actions (deploy-pages.yml)
```

The repo root no longer contains `index.html` or a top-level `styles.css`;
both moved under `src/` in M3 (the legacy aggregate `styles.css` was
unused and deleted). The build emits a self-contained `dist/` artifact
that contains its own copy of `index.html`, the bundled `main.js`, and a
copy of `src/styles/`.

## dist/

```text
dist/
+- index.html         Page entry (relative main.js + styles/foo.css references)
+- main.js            esbuild bundle (~520KB minified; JSON + CSV data inlined)
+- main.js.map        Sourcemap for main.js
+- styles/            Copy of src/styles/*.css (10 files, served as static assets)
`- .nojekyll          GitHub Pages marker to disable Jekyll processing
```

## Source directory

```text
src/
+- index.html              Single-page app shell (copied into dist/ at build time)
+- main.ts                 Bootstrap: load data, build context, wire game loop
+- player.ts               Player state model, stat helpers, identity fields
+- team.ts                 Team structure, conference, schedule, standings
+- ncaa.ts                 NCAA school CSV loader, conference assignment
+- nfl.ts                  NFL business logic (draft, retirement, HOF, legacy)
+- recruiting.ts           College recruiting and offer generation
+- recruiting_profile.ts   Persistent recruiting profile and star rating
+- season_arc.ts           Five-phase season arc (preseason..postseason)
+- crisis.ts               Midseason crisis system (0-2 per season)
+- activities.ts           Weekly activity options with phase filters
+- events.ts               Narrative event filter/select/apply
+- milestones.ts           One-time career story moments
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
|  +- game_context.ts      GameContext type alias for CareerContext (used by plugin hooks)
|  +- choice_option.ts     Shared ChoiceOption type
|  +- rng.ts               Seeded mulberry32 RNG (rand, randInt, randRange)
+- plugins/                Plugin host facade and plugin tree (M1+)
|  +- plugin_host.ts       PluginHost facade and 8 registry contract interfaces
|  +- build_host.ts        buildPluginHost() factory
|  +- register_plugins.ts  registerAllPlugins(host) boot site
|  +- registries/          8 thin registry implementations
|  |  +- phase_registry.ts
|  |  +- event_registry.ts
|  |  +- choice_registry.ts
|  |  +- rules_registry.ts
|  |  +- ui_registry.ts
|  |  +- lifecycle_registry.ts
|  |  +- activity_registry.ts
|  |  `- data_pack_registry.ts
|  +- childhood/           M3-A vertical-slice plugin (ages 1-13)
|  |  +- index.ts          childhoodPlugin entry, register() call site
|  |  +- phase_handler.ts  3 phase handlers (kid_years, peewee, travel)
|  |  +- tabs.ts           Childhood tab registrations
|  |  +- activities.json   Childhood activity data
|  |  +- activities_loader.ts  Fetch + cache
|  |  +- events_loader.ts  Fetch + cache childhood events
|  |  +- events/
|  |  |  `- childhood.json  Merged 9 age-specific event files
|  |  +- lifecycle/
|  |  |  +- age_5_first_football.ts  AgeHook at age 5
|  |  |  +- childhood_entry.ts  PhaseStartHook at phase start
|  |  |  `- hooks.ts        Registration aggregator
|  |  `- panels/
|  |     `- career_panel.ts Career-tab panel (minimal status-only)
|  +- high_school/         M2 vertical-slice plugin (ages 14-17)
|  |  +- index.ts          highSchoolPlugin GamePlugin entry, register() call site
|  |  +- phase_handler.ts  Registers hsFroshSophHandler and hsVarsityHandler via host.phases
|  |  +- activities.json   HS activity data (authoritative source)
|  |  +- activities_loader.ts  Fetch + cache HS activities
|  |  +- tabs.ts           6 tab registrations (life/stats/activities/team/career/social)
|  |  +- events_loader.ts  Fetch + cache HS events
|  |  +- events/
|  |  |  `- high_school.json  HS event data (moved via git mv)
|  |  +- lifecycle/
|  |  |  +- drivers_permit.ts  AgeHook at age 15
|  |  |  +- hs_entry.ts        PhaseStartHook for HS phase entry
|  |  |  `- hooks.ts           Lifecycle registration aggregator
|  |  +- panels/
|  |  |  `- career_panel.ts Career-tab panel using ctx.getPlayer() accessor
|  |  `- packs/
|  |     +- example_pack.json  DataPack M5 proof example
|  |     `- example_pack_loader.ts  Fetch + cache example pack
|  +- college/             M3-B vertical-slice plugin (ages 18-21)
|  |  +- index.ts          collegePlugin entry, register() call site
|  |  +- phase_handler.ts  3 phase handlers
|  |  +- tabs.ts           College tab registrations
|  |  +- activities.json   College activity data
|  |  +- activities_loader.ts  Fetch + cache
|  |  +- events_loader.ts  Fetch + cache college events
|  |  +- events/
|  |  |  `- college.json  College event data
|  |  +- lifecycle/
|  |  |  +- nfl_declaration.ts  AgeHook at age 20 (early-declare option)
|  |  |  +- college_entry.ts    PhaseStartHook at phase start
|  |  |  `- hooks.ts            Registration aggregator
|  |  `- panels/
|  |     `- career_panel.ts Career-tab panel
|  +- nfl/                 M3-C vertical-slice plugin (ages 22-39)
|  |  +- index.ts          nflPlugin entry, register() call site
|  |  +- phase_handler.ts  5 phase handlers
|  |  +- tabs.ts           NFL tab registrations
|  |  +- activities.json   NFL activity data
|  |  +- activities_loader.ts  Fetch + cache
|  |  +- events_loader.ts  Fetch + cache NFL events
|  |  +- events/
|  |  |  `- nfl.json      NFL event data
|  |  +- lifecycle/
|  |  |  +- draft_day.ts        AgeHook at age 22
|  |  |  +- nfl_entry.ts        PhaseStartHook at phase start
|  |  |  +- retirement.ts       CareerEndHook at retirement
|  |  |  `- hooks.ts            Registration aggregator
|  |  `- panels/
|  |     `- career_panel.ts Career-tab panel
|  `- scout_report/        M6-A optional feature plugin (panel-only proof)
|     +- index.ts          scoutReportPlugin entry, register() only (DOM-free)
|     +- scout_report_logic.ts  Report generation logic
|     `- panels/
|        `- scout_report_panel.ts Scout report render using ctx.getPlayer()
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
|  |  +- team_strength_model.ts Ratings used by play resolution
|  |  `- math_utils.ts      Math helpers for play resolution
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
+- view_state/             (archived; see archive/disconnected_features/view_state/)
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
|  +- ui_utils.ts          UI phase helpers and formatting utilities
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
|  +- game_utils.ts        Shared game simulation utilities (performance ratings, OT points)
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
|  +- hs_postgrad.ts       Optional post-grad/prep-year path
|  +- hs_season_builder.ts 8-team conference, 10-game schedule
|  +- juco_season_builder.ts JUCO alternate-path schedule builder
|  +- hs_recruiting.ts     Recruiting flow orchestration
|  +- recruiting_events.ts Recruiting story events
|  +- recruiting_helpers.ts Recruiting interest/score helpers
|  `- recruiting_offers.ts Offer generation and acceptance
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
```

### Phase folder architecture decision (M3)

The four phase folders (childhood, high_school, college, nfl_handlers) remain
in the tree under `src/` even though handler registration moved to
`src/plugins/` in M3. The cost of moving and deleting ~95 lines of handler
code outweighs the architectural benefit of colocation. Handler implementations
stay under their phase folders; each phase plugin's `register(host)` method
imports its handlers and wires them via `host.phases.register()`. This
decoupling is acceptable and maintains stable code organization across M1-M3.

```text
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
   `- choices/             Per-arc weekly-choice catalogs (JSON-only as of 2026-05)
      +- preseason.json
      +- opening.json
      +- midseason.json
      +- stretch.json
      `- postseason.json
```

Per-phase event JSON now lives under each plugin tree
([src/plugins/childhood/events/](../src/plugins/childhood/events/),
[src/plugins/high_school/events/](../src/plugins/high_school/events/),
[src/plugins/college/events/](../src/plugins/college/events/),
[src/plugins/nfl/events/](../src/plugins/nfl/events/)); the legacy
`src/data/events/` directory has been removed.

## Tests and tools

```text
tests/
+- smoke.sh                     Shell wrapper for smoke runs
+- TESTS_README.md              Test-suite overview and command reference
+- test_*.ts                    TS tests (handler registry, player helpers, RNG, simulator, plugin host, choice schemas) discovered via `node --test 'tests/test_*.ts'`
+- test_dom_imports.ts          Boundary check: core code must not import DOM
+- test_math_random_budget.ts   Static budget on Math.random usage
+- test_plugin_boundaries.ts    Plugin tree boundary check (no cross-plugin imports)
+- test_*.py                    Python lint/compliance tests (pyflakes, ASCII, imports, indentation, shebangs, bandit, init files, naming, readme paragraph)
+- check_ascii_compliance.py    Single-file ASCII/ISO-8859-1 checker
+- fix_ascii_compliance.py      Single-file ASCII fixer
+- fix_whitespace.py            Single-file whitespace fixer
+- conftest.py                  pytest config (excludes e2e/playwright subtrees)
+- git_file_utils.py            Repo-root helper used by Python tests
+- fixtures/
|  `- csv_loader.mjs            Node ESM loader hook for .csv text imports
+- playwright/                  Browser-driven Playwright tests
   `- autoplay.mjs              Headless autoplay smoke driver

tools/
+- sim_player_season.ts         Standalone single-player season simulator
+- sim_conference_season.ts     Conference simulation harness
+- sim_positions.ts             Per-position stat distribution
+- sim_conf/
|  +- aggregators.ts            Conference-sim stat aggregators
|  +- display.ts                Conference-sim text output helpers
|  `- types.ts                  Conference-sim shared types
`- extract_avataaars.py         Pull Avataaars parts into avatar_parts.ts

devel/
+- commit_changelog.py          Helper for staging changelog edits before commit
+- setup_typescript.sh          One-time npm install and initial build
`- setup_playwright.sh          One-time Playwright + chromium install
```

## Documentation map

### Game design

- [BITLIFE_GAME_SPEC.md](BITLIFE_GAME_SPEC.md)
- [THE_SHOW_GAME_SPEC.md](THE_SHOW_GAME_SPEC.md)
- [AGE_PROGRESSION.md](AGE_PROGRESSION.md)
- [PORTRAIT_SYSTEM.md](PORTRAIT_SYSTEM.md)
- [college_football_recruiting_bitlife_sim_design.md](college_football_recruiting_bitlife_sim_design.md)

### Project management

- [CHANGELOG.md](CHANGELOG.md)
- [CHANGELOG-2026-05a.md](CHANGELOG-2026-05a.md)
- [ROADMAP.md](ROADMAP.md)
- [TODO.md](TODO.md)
- [IDEAS_LIST.md](IDEAS_LIST.md)
- [AUTOPLAY_FINDINGS.md](AUTOPLAY_FINDINGS.md)

### Developer reference

- [CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md)
- [PLUGIN_ARCHITECTURE.md](PLUGIN_ARCHITECTURE.md)
- [E2E_TESTS.md](E2E_TESTS.md)
- [PLAYWRIGHT_USAGE.md](PLAYWRIGHT_USAGE.md)
- [AUTHORS.md](AUTHORS.md)

### Style guides

- [TYPESCRIPT_STYLE.md](TYPESCRIPT_STYLE.md)
- [PYTHON_STYLE.md](PYTHON_STYLE.md)
- [PYTEST_STYLE.md](PYTEST_STYLE.md)
- [REPO_STYLE.md](REPO_STYLE.md)
- [MARKDOWN_STYLE.md](MARKDOWN_STYLE.md)
- [CLAUDE_HOOK_USAGE_GUIDE.md](CLAUDE_HOOK_USAGE_GUIDE.md)

## Generated artifacts

| Artifact             | Location            | Git-ignored |
| -------------------- | ------------------- | ----------- |
| Self-contained build | `dist/`             | YES         |
| npm packages         | `node_modules/`     | YES         |
| Game screenshots     | `game_screenshots/` | YES         |

## Where to add new work

- **New age bands**: implement `YearHandler` in a plugin under [plugins](../src/plugins/) (create `src/plugins/<phase_name>/`), then call `host.phases.register(handler)` from the plugin's `register(host)` method. See [CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md) for examples.
- **New events**: add JSON entries to src/data and let [src/events.ts](../src/events.ts) auto-filter.
- **New positions**: extend `Position` in [src/player/identity.ts](../src/player/identity.ts), add a StatLine in [src/week_sim/stat_lines.ts](../src/week_sim/stat_lines.ts), and add a clutch pool in [src/clutch/](../src/clutch/) if a new bucket.
- **Play-by-play rules**: add a rule module under [src/simulator/rules/](../src/simulator/rules/) and wire it in via the league rules interface.
- **Shared logic**: add to [src/shared/](../src/shared/) for cross-handler utilities.
- **UI widgets**: add a focused module under [src/ui/](../src/ui/) and re-export from [src/ui/index.ts](../src/ui/index.ts).
- **Render layer**: extend if adding a new `GameViewState` slice.
- **Styles**: add or extend a CSS module under [src/styles/](../src/styles/) and link it from [src/index.html](../src/index.html). The build copies `src/styles/` into `dist/styles/`.
- **Tests**: TS tests as `tests/test_*.ts` (TS) or `tests/test_*.py` (Python lint/compliance).
- **Tools**: standalone analysis scripts under `tools/`.
- **Documentation**: under `docs/` using SCREAMING_SNAKE_CASE.

## Known gaps

- `docs/superpowers/` and `docs/archive/` are project artifact directories
  present under `docs/`; verify whether they should remain there or move
  to `tools/` or a separate planning directory.
- The `LICENSE.CC_BY_4_0` file referenced in earlier revisions of this
  document is not present at the repo root; only `LICENSE.LGPL_v3` is
  tracked. Confirm whether the CC-BY non-code license still applies and
  needs to be added back.
- An empty/orphan `_site/` tree remains at the repo root, left over from
  the M3-era Pages staging layout that M4 removed. The directory is
  untracked and ignored by ESLint/Prettier; the user can `rm -rf _site`
  whenever convenient.
