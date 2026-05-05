# Code architecture

## Overview

Gridiron Life is a BitLife-style single-page browser game built in TypeScript and
compiled to ES2020. The player lives through a complete American football career:
childhood, high school, college, and NFL. The codebase uses a year-handler registry
pattern where each age band (13 total) has its own handler module. Football phases
share a weekly engine that guarantees week advancement, and all rendering flows
through a single DOM-based UI layer.

The architecture is layered: core interfaces and registry at the bottom, age-band
handlers in the middle, simulation and event logic alongside them, and UI rendering
at the top. [src/main.ts](src/main.ts) orchestrates startup and phase transitions
but delegates yearly gameplay to the handler registry.

## Major components

### Core engine

- [src/core/year_handler.ts](src/core/year_handler.ts): frozen interfaces that define
  the handler contract. `YearHandler` (id, age range, startYear, optional endYear and
  getSeasonConfig), `CareerContext` (story-oriented output with no DOM manipulation),
  `SeasonConfig` (season length, football flag, depth chart, event chance, opponent
  strength), and `WeekAdvanceResult` discriminated union (next_week or season_ended).
- [src/core/year_registry.ts](src/core/year_registry.ts): maps ages to handlers.
  `registerHandler()` validates no age-band overlaps. `getHandler(age)` returns the
  handler for a given age. Frozen after boot.
- [src/core/year_runner.ts](src/core/year_runner.ts): dispatches player to the correct
  handler. `advanceToNextYear()` increments age and calls startYear(). `startYear()`
  resumes at the current age for save/load.
- [src/core/register_handlers.ts](src/core/register_handlers.ts): boot-time registration
  of all 13 age-band handlers. Called once during game init.

### Weekly engine

- [src/weekly/weekly_engine.ts](src/weekly/weekly_engine.ts): shared weekly loop for
  all football phases. Every code path ends in next_week or season_ended. State machine:
  focus, activity, event, game, results. Handlers call `startSeason()` once and the
  engine drives all weekly advancement. Used by HS (10 weeks), college (12 weeks), and
  NFL (17 weeks).

### Age-band handlers

Childhood (no football):

- [src/childhood/kid_years.ts](src/childhood/kid_years.ts): ages 1-7, BitLife-style
  event stubs with Continue buttons.
- [src/childhood/peewee_years.ts](src/childhood/peewee_years.ts): ages 8-10, town
  name and mascot generation.
- [src/childhood/travel_years.ts](src/childhood/travel_years.ts): ages 11-13, same
  town identity carried forward.

High school:

- [src/high_school/hs_frosh_soph.ts](src/high_school/hs_frosh_soph.ts): ages 14-15,
  generates HS identity, 10-game season.
- [src/high_school/hs_varsity.ts](src/high_school/hs_varsity.ts): ages 16-17, driver
  license at 16, recruiting stars.

College:

- [src/college/college_entry.ts](src/college/college_entry.ts): age 18, redshirt
  support, 12-game season.
- [src/college/college_core.ts](src/college/college_core.ts): ages 19-20, early
  declaration option for juniors.
- [src/college/college_senior.ts](src/college/college_senior.ts): age 21, graduation,
  mandatory draft declaration.

NFL:

- [src/nfl_handlers/nfl_rookie.ts](src/nfl_handlers/nfl_rookie.ts): age 22, rookie
  salary.
- [src/nfl_handlers/nfl_early.ts](src/nfl_handlers/nfl_early.ts): ages 23-26, salary
  based on depth chart.
- [src/nfl_handlers/nfl_peak.ts](src/nfl_handlers/nfl_peak.ts): ages 27-31, peak
  salary.
- [src/nfl_handlers/nfl_veteran.ts](src/nfl_handlers/nfl_veteran.ts): ages 32-36,
  retirement option, decline tracking.
- [src/nfl_handlers/nfl_late.ts](src/nfl_handlers/nfl_late.ts): ages 37-39, forced
  retirement check, farewell.

### Shared helpers

- [src/shared/year_helpers.ts](src/shared/year_helpers.ts): `applyAgeDrift()` for
  age-appropriate stat growth and decline curves across all bands.
  `coachAssignPosition()` for position assignment based on size and athleticism.

### Data and state models

- [src/player.ts](src/player.ts): player state (core stats, career stats, hidden
  stats, position types, depth chart, season records, persistent identity fields for
  town, HS, and NFL). Provides `createPlayer()` and stat modification helpers.
- [src/team.ts](src/team.ts): team structure (schedule, depth chart, conference,
  coach personality). Generates opponents, conferences, and standings.
- [src/ncaa.ts](src/ncaa.ts): NCAA school data loading from CSV, conference assignment,
  and college schedule generation.
- [src/save.ts](src/save.ts): browser localStorage persistence with JSON serialization
  and save migration for new fields.

### Season simulation layer

The season layer is the single source of truth for all season state. Games are the
atomic truth; standings and records are always derived from finalized games.

- [src/season/season_types.ts](src/season/season_types.ts): shared types (TeamId,
  GameId, GameStatus, StandingsRow, PlayoffSeed).
- [src/season/team_model.ts](src/season/team_model.ts): SeasonTeam class with identity
  and ratings. Does not store wins/losses.
- [src/season/game_model.ts](src/season/game_model.ts): SeasonGame class with
  scheduled/final status, scores, and winner/loser queries.
- [src/season/standings_model.ts](src/season/standings_model.ts): pure functions to
  derive standings from finalized games. Sorts by wins, losses, points-for.
- [src/season/season_model.ts](src/season/season_model.ts): LeagueSeason class. Owns
  all teams, games, current week. Query methods for record, standings, schedule,
  opponent. `advanceWeek()` refuses if games are unfinished.
- [src/season/season_builder.ts](src/season/season_builder.ts): shared schedule
  generation (round-robin, week assignment, non-conference, validation).
- [src/season/season_simulator.ts](src/season/season_simulator.ts): simulates
  non-player games each week, records player results from weekly engine.
- [src/season/playoff_bracket.ts](src/season/playoff_bracket.ts): generic bracket
  for HS (4-team), college (CFP), and NFL (7-seed) playoffs.

Phase-specific builders create LeagueSeason objects:

- [src/high_school/hs_season_builder.ts](src/high_school/hs_season_builder.ts): 8-team
  conference, 10-game schedule.
- [src/college/college_season_builder.ts](src/college/college_season_builder.ts): real
  NCAA school data from CSV, 12-game schedule.
- [src/nfl_handlers/nfl_season_builder.ts](src/nfl_handlers/nfl_season_builder.ts):
  32 real NFL teams in 8 divisions, 17-game schedule.

### Simulation engine

- [src/week_sim/](src/week_sim/): modular weekly simulation engine (split
  from the legacy `src/week_sim.ts` in M4). [src/week_sim.ts](src/week_sim.ts)
  is now a thin re-export shim. Submodules:
  [focus.ts](src/week_sim/focus.ts) (season-goal stat application and flavor
  pools), [goals.ts](src/week_sim/goals.ts) (goal catalog and activity bias),
  [momentum.ts](src/week_sim/momentum.ts) (performance ratings, letter
  grades, momentum decay), [stat_lines.ts](src/week_sim/stat_lines.ts)
  (per-position StatLine generators and depth-chart-aware scaling),
  [game.ts](src/week_sim/game.ts) (`simulateGame` orchestrator),
  [depth_chart.ts](src/week_sim/depth_chart.ts) (week-to-week depth chart
  evaluation), and [practice.ts](src/week_sim/practice.ts) (practice reps
  for backups/bench).
- [src/clutch/](src/clutch/): 4Q clutch-moment engine (split from
  `src/clutch_moment.ts` in M4). Submodules: [types.ts](src/clutch/types.ts)
  (public types, `BASE_RATES`, `SCORING_MAPS`),
  [situation.ts](src/clutch/situation.ts) (situation derivation and scene
  text), six per-position choice pools
  ([choices_qb.ts](src/clutch/choices_qb.ts),
  [choices_rb.ts](src/clutch/choices_rb.ts),
  [choices_wr.ts](src/clutch/choices_wr.ts),
  [choices_ol.ts](src/clutch/choices_ol.ts),
  [choices_def.ts](src/clutch/choices_def.ts),
  [choices_kicker.ts](src/clutch/choices_kicker.ts)),
  [resolve.ts](src/clutch/resolve.ts) (pool selection, risk spread, success
  resolution), and [index.ts](src/clutch/index.ts) (`buildClutchMoment`,
  `resolveClutchMoment`).
- [src/activities.ts](src/activities.ts): unlockable weekly activities (parties, gym,
  mentor meetings) with stat effects. Activities vary by career phase.
- [src/events.ts](src/events.ts): narrative event system. Filters events by phase,
  week, position, and player stats. Applies choice consequences to stats and story
  flags.
- [src/milestones.ts](src/milestones.ts): one-time career story moments. Tracks
  triggered milestones on the player and fires them during weekly engine after game
  results (18 milestones across HS, college, and NFL).

### Render layer and UI widgets

- [src/render/render_state.ts](src/render/render_state.ts): pull-model render
  orchestrator. `renderState(view: GameViewState)` reads the view-state contract
  from M2 and selectively updates DOM based on dirty flags (shallow compare). Each
  major view slice (header, statBars, career, story, social, seasonGoal) is
  compared against its last-rendered version; unchanged slices skip widget calls.
  Includes `clearRenderCache()` for game resets. Never imports simulation or phase
  code.

- [src/ui/](src/ui/): focused widget modules replacing the monolithic
  `src/ui.ts` (1440 lines, deleted in M5):
  - [header_widget.ts](src/ui/header_widget.ts): `updateHeader`, `updateLifeStatus`
  - [stats_widget.ts](src/ui/stats_widget.ts): `updateStatBar`, `updateAllStats`,
    `updateMiniStatStrip`, `updateStatsTab`
  - [story_widget.ts](src/ui/story_widget.ts): `clearStory`, `addHeadline`,
    `addText`, `addResult`, `addStatChange`, `showRecentChange`
  - [choice_widget.ts](src/ui/choice_widget.ts): `ChoiceOption` type,
    `showChoices`, `clearChoices`, `showWeeklyFocusChoices`, `showGameResult`
  - [team_widget.ts](src/ui/team_widget.ts): `updateTeamTab`
  - [activities_widget.ts](src/ui/activities_widget.ts): `renderActivitiesTab`
  - [career_widget.ts](src/ui/career_widget.ts): `updateCareerTab`,
    `updateSeasonCareer` (larger module with phase-specific renderers)
  - [week_card_widget.ts](src/ui/week_card_widget.ts): `updateWeekCard`,
    `hideWeekCard`, `updateThisWeekPanel`
  - [sidebar_widget.ts](src/ui/sidebar_widget.ts): `updateSidebar`,
    `showMilestoneCard`
  - [format_helpers.ts](src/ui/format_helpers.ts): `formatStatKey`,
    `formatStatLine`
  - [index.ts](src/ui/index.ts): barrel export of all above + re-export popup
    functions for backward compatibility

- [src/tabs.ts](src/tabs.ts): tab navigation system with phase-specific tab sets
  (life, stats, activities, team, career).
- [src/tab_manager.ts](src/tab_manager.ts): centralized tab lifecycle management.
  Delegates tab content rendering to ui widgets; owns coordination of when to
  update and what data to pass.
- [src/theme.ts](src/theme.ts): team color palette generation, contrast checking,
  and NFL team color mapping. Applies CSS custom properties for dynamic theming.
- [src/avatar.ts](src/avatar.ts) + [src/data/avatar_parts.ts](src/data/avatar_parts.ts):
  SVG portrait generator using Avataaars-inspired parts with age-based variation and
  archetype pools. Seeded by player name for consistency across ages.

### Business logic

- [src/college.ts](src/college.ts): college business logic (NIL deals, draft stock
  calculation, declaration eligibility).
- [src/nfl.ts](src/nfl.ts): NFL business logic (draft results, retirement checks,
  Hall of Fame eligibility, legacy summary).
- [src/recruiting.ts](src/recruiting.ts): college recruiting (offer generation,
  recruiting stars, commitment logic).

### Orchestration

- [src/main.ts](src/main.ts): bootstrap-only entry point (~280 lines after M6).
  Loads CSV/event data, builds the `CareerContext`, wires up tab manager and
  game loop, and routes between new-game and resume-game flows. Delegates
  yearly gameplay to the year runner; delegates character creation, the story
  log, and retirement to focused modules.
- [src/childhood/character_creation.ts](src/childhood/character_creation.ts):
  name input form, random name generation, and birth narrative. Takes a
  `CharacterCreationContext`.
- [src/childhood/name_loader.ts](src/childhood/name_loader.ts): CSV loader for
  first/last name lists with default fallbacks.
- [src/legacy/retirement.ts](src/legacy/retirement.ts): legacy-phase career
  summary, Hall of Fame check, and new-game restart flow. Takes a
  `RetirementContext`.
- [src/render/story_log.ts](src/render/story_log.ts): collapsible age/week
  story-log DOM helpers (`addStoryHeadline`, `addStoryText`, `clearStory`,
  `hardClearStory`).

## Data flow

Player state flows through the year-handler registry and weekly engine:

```text
year_runner.ts: advanceToNextYear(player, ctx)
  -> increment player.age
  -> year_registry.ts: getHandler(age) returns matching handler
  -> handler.startYear(player, ctx) sets up the year
  -> if football year: handler calls weekly_engine.startSeason(season)
     -> LeagueSeason is single source of truth for schedule/standings/games
     -> weekly loop: focus -> activity -> event -> game -> results
     -> check milestones.ts after each game
     -> after final week: season_ended -> handler.endYear()
  -> if non-football year: handler shows events via ctx.addText() and ctx.showChoices()
  -> year_runner.ts: advanceToNextYear() for next age
  -> main.ts / tab_manager.ts: call tab widget functions from ui/ (via ui/index.js)
```

Rendering is decoupled via pull model (M5):

```text
game state (Player, LeagueSeason, etc.)
  -> projection to GameViewState (view_state/game_view_state.ts)
  -> render_state.ts: renderState(view) compares dirty flags
  -> calls appropriate ui/*/widget.ts functions only if view slice changed
  -> each widget updates DOM for its responsibility (header, stats, story, etc.)
```

Phase transitions flow through [src/main.ts](src/main.ts):

```text
childhood (1-13, no football)
  -> high school (14-17, 10-week seasons)
  -> college (18-21, 12-week seasons)
  -> NFL (22-39, 17-week seasons)
  -> legacy
```

UI rendering is centralized: player state -> weekly engine -> season model -> ui.ts
-> DOM updates.

## Extension points

- **New age bands**: create a handler implementing `YearHandler`, register it in
  [src/core/register_handlers.ts](src/core/register_handlers.ts). The registry
  validates no age overlaps.
- **New positions**: add to `Position` type in [src/player.ts](src/player.ts), add
  stat generation in [src/week_sim/stat_lines.ts](src/week_sim/stat_lines.ts),
  add position outputs in [src/data/positions.json](src/data/positions.json),
  and (if a new position bucket) add a clutch choice pool under
  [src/clutch/](src/clutch/) and route it from
  [src/clutch/resolve.ts](src/clutch/resolve.ts).
- **New events**: add entries to [src/data/events.json](src/data/events.json) with
  phase, conditions, choices, and effects. The event system auto-filters by phase
  and player state.
- **New activities**: add to the activity definitions in
  [src/activities.ts](src/activities.ts) with phase restrictions and stat effects.

## Phase architecture: shared engine, distinct phase adapters

The weekly engine owns only the lifecycle skeleton (prepare week -> choose
focus -> choose activity -> resolve event -> simulate game if scheduled ->
apply results -> advance week). Each phase handler owns its own identity:

- **High school** (`src/high_school/`): 10-week regular season, recruiting
  hooks (camp, highlight reel, social media, signing day), driver-license
  milestone, made-up school name and silly mascot pool, opponent strength
  base 40-45, JUCO/prep postgrad fallback.
- **College** (`src/college/`): 11-12-week season, redshirt option,
  transfer portal, NIL deals, junior/senior declaration windows, mandatory
  senior-year draft declaration, real FBS/FCS schools from NCAA data,
  opponent strength base 55-65.
- **NFL** (`src/nfl_handlers/`): 17-week season with playoffs, scouting
  combine narrative, draft day with team assignment, real 32-team league
  from CSV data, salary by depth chart, retirement check at age 32+,
  Hall of Fame at 10+ years with elite stats, opponent strength 60-70.

The shared engine never hard-codes any of these rules. Handlers carry the
phase-specific season config (`SEASON_CONFIG: SeasonConfig` constant in
each handler) and event/activity pools that filter by `player.phase`.
Activities are filtered by `getActivitiesForPhase(phase, player)` in
[src/activities.ts](src/activities.ts); events are filtered by
`filterEvents` in [src/events.ts](src/events.ts).

## Known gaps

- The recruiting system uses hardcoded school arrays in
  [src/recruiting.ts](src/recruiting.ts) that may differ from the NCAA CSV data in
  [src/ncaa.ts](src/ncaa.ts). Verify whether this causes inconsistencies.
- [src/game_loop.ts](src/game_loop.ts) is now a thin adapter that only the
  Activities tab refresh path uses. It is scheduled for retirement in M5 of
  the modularization plan once the render layer takes over its remaining
  responsibilities.
- NFL week-1 advancement currently throws `Cannot advance: 6 unfinished
  game(s) in week 1` from
  [src/season/season_model.ts](src/season/season_model.ts) under autoplay.
  Some non-player NFL games are not being finalized before the player's
  week ends. This is a season-layer issue (not part of the M3 handler
  cut) and will be addressed in M4 when the simulator is decomposed.
