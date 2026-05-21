# Code architecture

## Overview

Gridiron Life is a BitLife-style single-page browser game built in TypeScript and
compiled to ES2020. The player lives through a complete American football career:
childhood, high school, college, and NFL. The codebase uses a year-handler
registry pattern where each age band has its own handler module. Football phases
share a weekly engine that guarantees week advancement; per-game simulation runs
through a play-by-play simulator under [src/simulator/](../src/simulator/), and all
rendering flows through a pull-model render layer over focused UI widgets.

The architecture is layered:

1. Core handler interfaces and registry ([src/core/](../src/core/)).
2. Age-band handlers ([src/childhood/](../src/childhood/), [src/high_school/](../src/high_school/), [src/college/](../src/college/), [src/nfl_handlers/](../src/nfl_handlers/)).
3. Shared weekly engine ([src/weekly/](../src/weekly/)), season layer ([src/season/](../src/season/)), and play-by-play simulator ([src/simulator/](../src/simulator/)).
4. Narrative systems (events, milestones, crises, season arc, social feed).
5. Render layer ([src/render/](../src/render/)) feeding focused widgets ([src/ui/](../src/ui/)).

[src/main.ts](../src/main.ts) is bootstrap-only: load data, build the
`CareerContext`, wire up the tab manager and game loop, route between new-game
and resume-game flows, and delegate yearly gameplay to the year runner.

## Major components

### Core engine

- [src/core/year_handler.ts](../src/core/year_handler.ts): frozen contract interfaces
  (`YearHandler`, `CareerContext`, `SeasonConfig`, `WeekAdvanceResult`).
- [src/core/year_registry.ts](../src/core/year_registry.ts): age-to-handler map,
  validates no age-band overlap, frozen after boot.
- [src/core/year_runner.ts](../src/core/year_runner.ts): age advancement and handler
  dispatch (`advanceToNextYear`, `startYear`).
- [src/plugins/register_plugins.ts](../src/plugins/register_plugins.ts): boot-time
  registration of all phase plugins via PluginHost (each plugin calls
  `host.phases.register()` to wire its age-band handlers).

### Weekly engine

The weekly engine was split by cohesion in May 2026. The previous monolithic
`weekly_engine.ts` is now a barrel; each module owns its own functions:

- [src/weekly/weekly_engine.ts](../src/weekly/weekly_engine.ts): barrel for shared
  entry points.
- [src/weekly/season_lifecycle.ts](../src/weekly/season_lifecycle.ts): outer
  boundary; `startSeason` / `endSeason`, playoff bracket creation.
- [src/weekly/week_phases.ts](../src/weekly/week_phases.ts): per-week phase
  sequence: focus -> activity -> event -> game.
- [src/weekly/game_handler.ts](../src/weekly/game_handler.ts): per-week game
  orchestration (player game vs simulated background games).
- [src/weekly/playoff_handler.ts](../src/weekly/playoff_handler.ts): playoff bracket
  advancement.
- [src/weekly/engine_state.ts](../src/weekly/engine_state.ts): mutable engine state
  shared across modules.

Handlers call `startSeason()` once per year and the engine drives every weekly
step. Used by HS (10 weeks), college (12 weeks), and NFL (17 weeks plus
playoffs).

### Season layer

The season layer is the single source of truth for season state. Games are the
atomic truth; standings and records are derived from finalized games.

- [src/season/season_types.ts](../src/season/season_types.ts): shared types.
- [src/season/team_model.ts](../src/season/team_model.ts): `SeasonTeam` identity and
  ratings.
- [src/season/game_model.ts](../src/season/game_model.ts): `SeasonGame` scheduled /
  final status, scores.
- [src/season/standings_model.ts](../src/season/standings_model.ts): pure standings
  derivation.
- [src/season/season_model.ts](../src/season/season_model.ts): `LeagueSeason`;
  owns teams, games, current week. `advanceWeek()` refuses while games are
  unfinished.
- [src/season/season_builder.ts](../src/season/season_builder.ts): shared schedule
  helpers (round-robin, week assignment, non-conference padding).
- [src/season/season_simulator.ts](../src/season/season_simulator.ts): non-player
  game simulation each week.
- [src/season/playoff_bracket.ts](../src/season/playoff_bracket.ts): generic bracket
  for HS (4-team), college (CFP), and NFL (7-seed).

Phase-specific builders compose `LeagueSeason`:

- [src/high_school/hs_season_builder.ts](../src/high_school/hs_season_builder.ts):
  8-team conference, 10 games.
- [src/college/college_season_builder.ts](../src/college/college_season_builder.ts):
  real NCAA schools from CSV, 12 games.
- [src/nfl_handlers/nfl_season_builder.ts](../src/nfl_handlers/nfl_season_builder.ts):
  32 NFL teams in 8 divisions, 17 games.

### Per-game simulation

Two simulation paths coexist:

- **Play-by-play simulator** ([src/simulator/](../src/simulator/)): newer engine
  invoked through [src/simulator/adapter.ts](../src/simulator/adapter.ts). The
  engine runs a drive and possession state machine
  ([engine/state_machine.ts](../src/simulator/engine/state_machine.ts)), selects plays via
  [models/play_call_model.ts](../src/simulator/models/play_call_model.ts), resolves
  yardage and turnovers via
  [models/play_result_model.ts](../src/simulator/models/play_result_model.ts) and
  [models/special_teams_model.ts](../src/simulator/models/special_teams_model.ts),
  and applies per-league rules under [rules/](../src/simulator/rules/) (IHSA, FCS,
  NFL). Outputs go through [output/box_score.ts](../src/simulator/output/box_score.ts),
  [output/stat_line.ts](../src/simulator/output/stat_line.ts), and
  [output/story_summary.ts](../src/simulator/output/story_summary.ts).
- **Formula path** ([src/week_sim/](../src/week_sim/)): the older formula-based
  `simulateGame`, still used by the legacy code paths and the standalone
  simulation tools under `tools/`.

### Clutch moments

- [src/clutch/](../src/clutch/): 4Q clutch-moment engine.
  [types.ts](../src/clutch/types.ts) declares `BASE_RATES` and `SCORING_MAPS`;
  [situation.ts](../src/clutch/situation.ts) derives the situation; six per-bucket
  pools ([choices_qb.ts](../src/clutch/choices_qb.ts) through
  [choices_kicker.ts](../src/clutch/choices_kicker.ts)) supply choices;
  [resolve.ts](../src/clutch/resolve.ts) picks a pool and resolves;
  [index.ts](../src/clutch/index.ts) exports `buildClutchMoment` and
  `resolveClutchMoment`.

### Narrative systems

- [src/events.ts](../src/events.ts): filter events by phase, week, position, and
  stats; apply choice consequences from per-phase event libraries.
- [src/milestones.ts](../src/milestones.ts): one-time career story moments fired
  after game results.
- [src/season_arc.ts](../src/season_arc.ts): five-phase arc
  (preseason, opening, midseason, stretch, postseason) that re-tones weekly
  choices and narration.
- [src/weekly/choices.ts](../src/weekly/choices.ts) plus
  [src/data/choices/](../src/data/choices/): per-arc weekly-choice catalogs loaded
  from JSON at runtime; schema validated by tests/test_choice_schemas.ts.
- [src/crisis.ts](../src/crisis.ts) plus
  [src/data/crises.json](../src/data/crises.json): 0-2 midseason crises per season
  that replace the normal weekly choice for their duration.
- [src/social/](../src/social/): Fotomagic feed.
  [fotomagic.ts](../src/social/fotomagic.ts) prompts posts on notable games and
  applies popularity; [feed_render.ts](../src/social/feed_render.ts) renders the
  Social tab.
- [src/activities.ts](../src/activities.ts): unlockable weekly activities filtered
  by phase.

### Age-band handlers

- **Childhood** (no football): [src/childhood/kid_years.ts](../src/childhood/kid_years.ts)
  (1-7), [src/childhood/peewee_years.ts](../src/childhood/peewee_years.ts) (8-10),
  [src/childhood/travel_years.ts](../src/childhood/travel_years.ts) (11-13).
- **High school**: [src/high_school/hs_frosh_soph.ts](../src/high_school/hs_frosh_soph.ts)
  (14-15), [src/high_school/hs_varsity.ts](../src/high_school/hs_varsity.ts)
  (16-17). Recruiting-event hooks live in
  [src/high_school/recruiting_events.ts](../src/high_school/recruiting_events.ts).
- **College**: [src/college/college_entry.ts](../src/college/college_entry.ts) (18),
  [src/college/college_core.ts](../src/college/college_core.ts) (19-20),
  [src/college/college_senior.ts](../src/college/college_senior.ts) (21).
- **NFL**: rookie (22), early (23-26), peak (27-31), veteran (32-36),
  late (37-39) under [src/nfl_handlers/](../src/nfl_handlers/).

### Data and state models

- [src/player.ts](../src/player.ts): public player state surface; backed by narrow
  type slices in [src/player/](../src/player/) (`identity`, `stats`,
  `stats_bundle`, `career`, `season_state`, `snapshot`).
- [src/team.ts](../src/team.ts): team structure, conferences, opponent generation.
- [src/ncaa.ts](../src/ncaa.ts): NCAA school CSV loader and conference assignment.
- [src/nfl.ts](../src/nfl.ts): NFL business logic (draft, retirement, HOF, legacy).
- [src/recruiting.ts](../src/recruiting.ts),
  [src/recruiting_profile.ts](../src/recruiting_profile.ts): college recruiting and
  persistent profile.
- [src/career_stats_view.ts](../src/career_stats_view.ts): career stat aggregation
  view helpers.
- [src/save/](../src/save/): versioned save (v1) with strict validation. No
  migrators; [save/validate.ts](../src/save/validate.ts) returns `ok | reset | empty`.

### Render layer and UI widgets

- [archive/disconnected_features/view_state/game_view_state.ts](../archive/disconnected_features/view_state/game_view_state.ts):
  archived simulation -> render contract (`GameViewState`, `HeaderView`, `StatBarView`,
  `CareerView`); no external importers, kept for future reactivation.
- [src/render/story_log.ts](../src/render/story_log.ts): collapsible age/week
  story-log DOM helpers.
- [src/ui/](../src/ui/): focused widget modules
  (`header_widget`, `stats_widget`, `story_widget`, `choice_widget`,
  `team_widget`, `activities_widget`, `career_widget`, `week_card_widget`,
  `sidebar_widget`, `format_helpers`) re-exported through
  [src/ui/index.ts](../src/ui/index.ts).
- [src/tabs.ts](../src/tabs.ts) and [src/tab_manager.ts](../src/tab_manager.ts):
  tab navigation and centralized tab lifecycle.
- [src/theme.ts](../src/theme.ts): team color palettes and CSS custom-property
  theming.
- [src/avatar.ts](../src/avatar.ts) plus
  [src/data/avatar_parts.ts](../src/data/avatar_parts.ts): SVG portrait generator.
- [src/styles/](../src/styles/): CSS modules loaded directly by
  [index.html](../index.html) (base, layout, buttons, modals, tabs, stats, story,
  activities, phases, social).
- [src/popup.ts](../src/popup.ts), [src/dom_utils.ts](../src/dom_utils.ts),
  [src/stat_info.ts](../src/stat_info.ts), [src/team_emoji.ts](../src/team_emoji.ts):
  small UI helpers shared across widgets.

### Orchestration

- [src/main.ts](../src/main.ts): bootstrap-only entry. Loads CSV/event data, builds
  the `CareerContext`, wires the tab manager and game loop, routes new-game vs
  resume.
- [src/childhood/character_creation.ts](../src/childhood/character_creation.ts):
  name input form and birth narrative.
- [src/childhood/name_loader.ts](../src/childhood/name_loader.ts): name CSV loader
  with built-in fallback lists.
- [src/legacy/retirement.ts](../src/legacy/retirement.ts): retirement, Hall of Fame
  check, restart flow.
- [src/game_loop.ts](../src/game_loop.ts): legacy adapter retained for the
  Activities-tab refresh path; not the main per-week driver.

## Data flow

Year and week advancement:

```text
year_runner.advanceToNextYear(player, ctx)
  -> increment player.age
  -> year_registry.getHandler(age) -> handler
  -> handler.startYear(player, ctx) sets up the year
  -> football year:
       handler -> weekly_engine.startSeason(season)
         -> LeagueSeason is the source of truth for schedule/standings
         -> weekly loop: focus -> activity -> event -> game -> results
           -> game routes through simulator/adapter (or week_sim) for play sim
           -> clutch hook may fire in 4Q via clutch/
           -> milestones.ts checked after results
         -> after final week + playoffs: season_ended -> handler.endYear()
  -> non-football year:
       handler shows events through ctx.addText() / ctx.showChoices()
  -> year_runner.advanceToNextYear() to next age
```

Rendering (pull model):

```text
game state (Player, LeagueSeason, season_arc, ...)
  -> project to GameViewState (view_state/game_view_state.ts)
  -> each ui/*_widget.ts function updates its DOM based on current state
```

Phase transitions flow through [src/main.ts](../src/main.ts):

```text
childhood (1-13)
  -> high school (14-17, 10 wk)
  -> college (18-21, 12 wk)
  -> NFL (22-39, 17 wk + playoffs)
  -> legacy
```

## Testing and verification

- [check_codebase.sh](../check_codebase.sh): runs `tsc -p tsconfig.lint.json
  --noEmit` and the TS test runner [tests/run.ts](../tests/run.ts).
- [tests/playwright/autoplay.mjs](../tests/playwright/autoplay.mjs) plus [tests/smoke.sh](../tests/smoke.sh):
  headless autoplay smoke through the full career.
- TS unit tests under `tests/test_*.ts` (handler registry, player helpers,
  RNG, simulator).
- Python lint suite under `tests/test_*.py` (pyflakes, ASCII compliance,
  import rules, naming conventions, indentation, shebangs, markdown links).
- Browser-driven Playwright tests under [tests/playwright/](../tests/playwright/);
  see [E2E_TESTS.md](E2E_TESTS.md) and
  [PLAYWRIGHT_USAGE.md](PLAYWRIGHT_USAGE.md).
- [tests/check_dom_imports.ts](../tests/check_dom_imports.ts) enforces that core /
  simulation code does not import DOM APIs.
- [tests/check_math_random_budget.ts](../tests/check_math_random_budget.ts)
  bounds `Math.random` usage to keep simulation reproducible.

## Extension points

> **STATUS (M3-C complete):** All four career-phase plugins (childhood, high_school,
> college, nfl) now register through the plugin host. Phase handlers are registered
> by each plugin's `register(host)` call in
> [src/plugins/register_plugins.ts](../src/plugins/register_plugins.ts).
> See [PLUGIN_ARCHITECTURE.md](PLUGIN_ARCHITECTURE.md) for the plugin contract.
> Optional feature plugins (e.g., scout_report) follow panel-only pattern with
> DOM-free index.ts registration. Extension-points rewrite owned by M6.

- **New age band**: implement `YearHandler`, register via plugin under
  [plugins](../src/plugins/) (create `src/plugins/<phase_name>/`) by calling
  `host.phases.register(handler)` in the plugin's `register(host)` method. See
  [PLUGIN_ARCHITECTURE.md](PLUGIN_ARCHITECTURE.md) for worked examples.
- **New event**: register via plugin by calling `host.events.registerMany(loadEvents())`
  in the plugin's `register(host)` method (see plugins for examples). Shared events
  can be loaded from JSON via the core loader in [src/events.ts](../src/events.ts).
- **New crisis**: add to [src/data/crises.json](../src/data/crises.json); loader
  in [src/data/crises.ts](../src/data/crises.ts).
- **New weekly choice**: add to the right JSON under
  [src/data/choices/](../src/data/choices/); the arc loader picks it up via
  [src/weekly/choices.ts](../src/weekly/choices.ts).
- **New position**: add to `Position` in
  [src/player/identity.ts](../src/player/identity.ts), add a StatLine in
  [src/week_sim/stat_lines.ts](../src/week_sim/stat_lines.ts), update
  [src/data/positions.json](../src/data/positions.json), and add a clutch pool
  under [src/clutch/](../src/clutch/) if a new bucket.
- **New league ruleset**: add a rules module under
  [src/simulator/rules/](../src/simulator/rules/) and wire it from the rules
  interface.
- **New UI widget**: add a focused module under [src/ui/](../src/ui/) and
  re-export from [src/ui/index.ts](../src/ui/index.ts).
- **New render slice**: note that `GameViewState` was archived to
  [archive/disconnected_features/view_state/game_view_state.ts](../archive/disconnected_features/view_state/game_view_state.ts)
  (zero importers); for future M5 render layer, design a new view state contract and
  add corresponding rendering logic to the appropriate widget under [src/ui/](../src/ui/).

## Phase architecture: shared engine, distinct phase adapters

The weekly engine only owns the lifecycle skeleton (prepare week -> choose
focus -> choose activity -> resolve event -> simulate game if scheduled ->
apply results -> advance week). Each phase carries its own identity through
its `SeasonConfig` and through phase-filtered event, choice, activity, and
crisis pools.

## Known gaps

- The recruiting system uses hardcoded school arrays in
  [src/recruiting.ts](../src/recruiting.ts) that may differ from the NCAA CSV data
  loaded by [src/ncaa.ts](../src/ncaa.ts). Verify whether this causes
  inconsistencies.
- Two per-game simulation paths coexist
  ([src/simulator/](../src/simulator/) and [src/week_sim/](../src/week_sim/));
  the long-term direction (single canonical path vs adapter forever) is not yet
  recorded in the repo.
- [src/game_loop.ts](../src/game_loop.ts) remains as a legacy adapter for the
  Activities-tab refresh path. Whether it can be fully absorbed into the render
  layer is still open.
