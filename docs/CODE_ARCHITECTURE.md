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

- [src/week_sim.ts](src/week_sim.ts): core simulation logic. Applies weekly focus
  choices (train, film study, recovery, social, teamwork), generates position-specific
  game stats, evaluates depth chart movement, and calculates performance ratings.
- [src/activities.ts](src/activities.ts): unlockable weekly activities (parties, gym,
  mentor meetings) with stat effects. Activities vary by career phase.
- [src/events.ts](src/events.ts): narrative event system. Filters events by phase,
  week, position, and player stats. Applies choice consequences to stats and story
  flags.
- [src/milestones.ts](src/milestones.ts): one-time career story moments. Tracks
  triggered milestones on the player and fires them during weekly engine after game
  results (18 milestones across HS, college, and NFL).

### UI layer

- [src/ui.ts](src/ui.ts): centralized DOM rendering for story log, stat bars, modals,
  event cards, game results, standings, and career stats. Formats position-specific
  stat labels. Manages header, portrait, and tab content updates.
- [src/tabs.ts](src/tabs.ts): tab navigation system with phase-specific tab sets
  (life, stats, activities, team, career).
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

### Legacy phase modules

These monolithic phase runners predate the handler registry and are being replaced:

- [src/hs_phase.ts](src/hs_phase.ts): high school phase runner.
- [src/college_phase.ts](src/college_phase.ts): college phase runner.
- [src/nfl_phase.ts](src/nfl_phase.ts): NFL phase runner.

### Orchestration

- [src/main.ts](src/main.ts): entry point. Handles character creation, phase
  transitions, save/load, tab switching, and global state wiring. Calls
  `registerAllHandlers()` at boot and delegates yearly gameplay to the year runner.

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
  -> ui.ts: updateHeader() renders portrait and stats
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
  stat generation in [src/week_sim.ts](src/week_sim.ts), add position outputs in
  [src/data/positions.json](src/data/positions.json).
- **New events**: add entries to [src/data/events.json](src/data/events.json) with
  phase, conditions, choices, and effects. The event system auto-filters by phase
  and player state.
- **New activities**: add to the activity definitions in
  [src/activities.ts](src/activities.ts) with phase restrictions and stat effects.

## Known gaps

- Legacy phase modules (`hs_phase.ts`, `college_phase.ts`, `nfl_phase.ts`) coexist
  with the new handler system. Verify whether they are still called or can be removed.
- The recruiting system uses hardcoded school arrays in
  [src/recruiting.ts](src/recruiting.ts) that may differ from the NCAA CSV data in
  [src/ncaa.ts](src/ncaa.ts). Verify whether this causes inconsistencies.
