# Code architecture

## Overview

Gridiron Life is a single-page browser game built in TypeScript. The player lives
through a complete American football career: childhood, high school, college, and NFL.
Each football phase shares a common weekly rhythm engine and renders through a single
DOM-based UI layer.

The codebase follows a layered architecture: data models at the bottom, simulation and
event logic in the middle, phase-specific modules above that, and UI rendering at the
top. [src/main.ts](src/main.ts) orchestrates phase transitions but delegates weekly
gameplay to phase modules.

## Major components

### Data and state models

- [src/player.ts](src/player.ts): player state definition (core stats, career stats,
  hidden stats, position types, depth chart, season records). Provides `createPlayer()`,
  stat modification helpers, and GPA/relationship tracking.
- [src/team.ts](src/team.ts): team structure (schedule, depth chart, conference,
  coach personality). Generates opponents, conferences, and standings.
- [src/ncaa.ts](src/ncaa.ts): NCAA school data loading from CSV, conference assignment,
  and college schedule generation.
- [src/save.ts](src/save.ts): browser localStorage persistence with JSON serialization
  and save migration.

### Simulation engine

- [src/week_sim.ts](src/week_sim.ts): core simulation logic. Applies weekly focus
  choices (train, film study, recovery, social, teamwork), generates position-specific
  game stats, evaluates depth chart movement, and calculates performance ratings.
- [src/activities.ts](src/activities.ts): unlockable weekly activities (parties, gym,
  mentor meetings) with stat effects. Activities vary by career phase.
- [src/events.ts](src/events.ts): narrative event system. Filters events by phase,
  week, position, and player stats. Applies choice consequences to stats and story
  flags.

### Game loop and phase management

- [src/game_loop.ts](src/game_loop.ts): shared weekly rhythm engine used by all
  football phases. The weekly cycle is: focus choice, activities, event check, game
  day, results. Phase modules provide callbacks to customize behavior.
- [src/hs_phase.ts](src/hs_phase.ts): high school phase (4 seasons, recruiting,
  depth chart progression, state championship).
- [src/college_phase.ts](src/college_phase.ts): college phase (up to 4 seasons, NCAA
  team assignment, conference play, draft stock tracking).
- [src/college.ts](src/college.ts): college business logic (NIL deals, draft stock
  calculation, season simulation, declaration eligibility).
- [src/nfl_phase.ts](src/nfl_phase.ts): NFL phase (draft, seasonal play, team
  management, retirement handling).
- [src/nfl.ts](src/nfl.ts): NFL business logic (draft results, season simulation,
  midseason events, retirement checks, Hall of Fame eligibility, legacy summary).
- [src/recruiting.ts](src/recruiting.ts): college recruiting (offer generation,
  recruiting stars, commitment logic).

### UI layer

- [src/ui.ts](src/ui.ts): DOM rendering for story log, stat bars, modals, event
  cards, game results, standings, and career stats. Formats position-specific stat
  labels.
- [src/tabs.ts](src/tabs.ts): tab navigation system with phase-specific tab sets
  (life, stats, activities, team, career).
- [src/theme.ts](src/theme.ts): team color palette generation, contrast checking,
  and NFL team color mapping. Applies CSS custom properties for dynamic theming.
- [src/avatar.ts](src/avatar.ts): SVG portrait generator using Avataaars-inspired
  parts with age-based variation and archetype pools.

### Orchestration

- [src/main.ts](src/main.ts): entry point. Handles character creation, phase
  transitions (childhood, youth, HS, college, NFL, legacy), save/load, tab switching,
  and global state wiring. Does not contain weekly loop logic.

## Data flow

A typical in-season week follows this path:

```text
game_loop.ts: showWeeklyFocusUI()
  -> player picks focus (train, film study, etc.)
  -> week_sim.ts: applyWeeklyFocus() modifies player stats
  -> activities.ts: activity hub (optional unlocked activities)
  -> events.ts: filterEvents() + selectEvent() checks for narrative event
  -> week_sim.ts: simulateGame() generates position-specific stat line
  -> phase module: accumulates stats, updates depth chart, checks season end
  -> ui.ts: renders story, stats, game result
  -> save.ts: persists to localStorage
```

Phase transitions flow through [src/main.ts](src/main.ts):

```text
childhood (0-9) -> youth football (10-13) -> high school (14-17)
  -> college (18-21) -> NFL draft -> NFL career -> retirement -> legacy
```

## Extension points

- **New positions**: add to `Position` type in [src/player.ts](src/player.ts), add
  stat generation in [src/week_sim.ts](src/week_sim.ts), add position outputs in
  [src/data/positions.json](src/data/positions.json).
- **New events**: add entries to [src/data/events.json](src/data/events.json) with
  phase, conditions, choices, and effects. The event system auto-filters by phase
  and player state.
- **New activities**: add to the activity definitions in
  [src/activities.ts](src/activities.ts) with phase restrictions and stat effects.
- **New career phases**: create a phase module following the pattern in
  [src/hs_phase.ts](src/hs_phase.ts), wire it into [src/main.ts](src/main.ts).

## Known gaps

- Three JSON data files ([src/data/positions.json](src/data/positions.json),
  [src/data/names.json](src/data/names.json), [src/data/teams.json](src/data/teams.json))
  exist but may not be imported by any TypeScript module. Verify whether they are
  loaded at runtime via fetch or are legacy files.
- The recruiting system uses hardcoded school arrays in
  [src/recruiting.ts](src/recruiting.ts) that differ from the NCAA CSV data in
  [src/ncaa.ts](src/ncaa.ts). Verify whether this mismatch causes inconsistencies.
