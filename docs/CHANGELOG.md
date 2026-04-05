# Changelog

## 2026-04-04 (UI/UX Dashboard Redesign)

### Additions and New Features

- **iPad dashboard layout** (`index.html`, `styles.css`): Restructured app into
  two-column dashboard on screens >= 768px. Left column has week card + story +
  choices. Right sidebar shows player identity, stat bars, phase-specific career
  info, and This Week checklist. Phone layout falls back to single column with
  compact stat strip.
- **Current-week card** (`styles.css`, `src/ui.ts`): Added context card above
  story showing age, year label, week, phase badge with phase-specific accent
  color, pressure indicator, and next opponent with emoji.
- **Sidebar: Player + Development** (`src/ui.ts`): Sidebar shows player name,
  position, team with emoji, depth chart, all 7 stat bars (compact), and most
  recent stat change text.
- **Sidebar: Season + Career** (`src/ui.ts`): Phase-specific career section.
  HS shows recruiting stars and offers. College shows NIL, draft stock. NFL shows
  contract, earnings, retirement pressure. Hidden during childhood/youth.
- **Sidebar: This Week panel** (`src/ui.ts`): Checklist showing focus, activity,
  event, and game day status. Makes weekly rhythm immediately visible.
- **Team emoji system** (`src/team_emoji.ts`): Maps team name keywords to emoji
  (Bears -> bear, Eagles -> eagle, etc.). Shown in header, team tab, sidebar,
  and week card opponent display.
- **Milestone event cards** (`src/ui.ts`, `styles.css`): `showMilestoneCard()`
  renders prominent gold-bordered cards in the story timeline for big life moments.
- **Mini stat strip** (`index.html`, `src/ui.ts`): Phone-only compact 3-bar strip
  (HP, TEC, IQ) visible on Life tab. Hidden when sidebar is visible on iPad.
- **Phase accent colors** (`styles.css`): Six phase-specific colors used on week
  card border and badge (childhood=blue, HS=green, college=orange, NFL=gold, etc.).

### Behavior or Interface Changes

- **Max width** (`styles.css`): Increased from 600px to 920px to fill iPad screen.
- **Text contrast** (`styles.css`): Bumped `--text-secondary` from `#a0a0b0` to
  `#b8b8c8` for better WCAG AA compliance.
- **Stat spacing** (`styles.css`): Increased stat row margins from 3px to 6px and
  panel padding from 6px to 12px.
- **Action budget wording** (`src/ui.ts`): Changed from "Actions: 2/3 used" to
  "1 action remaining" for clarity.
- **Focus states** (`styles.css`): Added `:focus-visible` outlines on choice
  buttons and tab buttons for keyboard accessibility.
- **Tab bar on iPad**: CSS hides Stats and Activities tab buttons on wide screens
  since sidebar covers that content.
- **Choices panel overflow** (`styles.css`): Added `max-height: 40vh` and scroll
  to prevent choice buttons from pushing below viewport.

### Decisions and Failures

- Sidebar uses three visual groups (Player+Dev, Season+Career, This Week) instead
  of five separate boxes to avoid visual clutter on iPad.
- Week card is part of normal layout flow, not sticky-pinned, to avoid eating
  vertical space on smaller iPads.
- Milestone card rendering is a simple v1 in ui.ts rather than a separate module.

## 2026-04-04 (NFL CSV Wiring + Bug Fixes)

### Additions and New Features

- **NFL teams CSV loader** (`src/nfl.ts`): Added `loadNFLTeams()` async loader and
  `getNFLTeams()` sync accessor that read team data from `src/data/nfl_teams.csv`.
  Follows the same `fetch()` pattern used by `loadNCAASchools()` in `src/ncaa.ts`.
- **Wired NFL modules to CSV** (`src/nfl_handlers/nfl_season_builder.ts`,
  `src/nfl_phase.ts`, `src/nfl.ts`): All three hardcoded NFL team arrays now read
  from the CSV loader. Team strengths are randomized per season (55-90). Hardcoded
  arrays kept as fallbacks if CSV fails to load.
- **Added missing DOM elements** (`index.html`): Added `team-record` and
  `recruiting-status` divs inside `life-status` section so `updateStatusBar()`
  calls from `hs_phase.ts` actually render.

### Fixes and Maintenance

- **Kicker confidence double-count** (`src/week_sim.ts:576`): Kickers had confidence
  in their base formula (0.5 weight) but also received the global confidence
  adjustment. Added `bucket !== 'kicker'` to the skip condition alongside QB.

## 2026-04-04 (Deep Bug Review - 22 Bugs Found, Fixes Applied)

### Fixes and Maintenance

- **Save migration gaps** (`src/save.ts`): Added migrations for `storyLog`, `careerHistory`,
  `bigDecisions`, `collegeOffers` (default `[]`), `storyFlags`, `milestones` (default `{}`),
  `teamStrength` (default 50), `positionBucket` (default null), `recruitingStars` (default 0),
  `draftStock` (default 0), `useRealTeamNames` (default true). Also patches per-entry
  `careerHistory` for missing `ties`, `highlights`, and `awards` fields on old saves.
- **SeasonRecord ties field** (`src/player.ts`): Added `ties: number` to `SeasonRecord`
  interface. Updated all `careerHistory.push` sites in `weekly_engine.ts`, `college_phase.ts`,
  `nfl_phase.ts`, `hs_phase.ts` to include `ties`.
- **Conference standings filter** (`src/season/standings_model.ts:131`): Changed `||` to `&&`
  so only games where both teams are in the conference count toward conference records.
- **DOM element guards** (`src/ui.ts`): Added `findElement()` helper for optional lookups.
  `updateStatusBar()`, `showStandings()`, `hideStandings()`, `toggleStandings()`,
  `showSchedule()`, `hideSchedule()`, `toggleSchedule()` now use safe lookups with early
  return instead of throwing when elements are missing from HTML.
- **QB confidence double-count** (`src/week_sim.ts:576`): Global confidence adjustment now
  skipped for QB position since confidence is already weighted 0.2 in the QB formula.
- **clampStat misused for wins** (`src/nfl.ts:152`): Replaced `clampStat()` (0-100) with
  `Math.max(0, Math.min(17, ...))` for NFL win counts.
- **Money going negative** (`src/nfl_handlers/nfl_rookie.ts:77`,
  `src/nfl_handlers/nfl_veteran.ts:116`): Added `Math.max(0, ...)` guard on money subtraction
  in offseason choice handlers.

### Decisions and Failures

- Deep bug review found 22 bugs total across 4 subsystems. 3 critical, 5 high, 8 medium, 6 low.
- Bugs 11 (missing Super Bowl round), 14 (redshirt 5th year unimplemented), 15 (childhood
  event index collision), 19 (duplicate game loops), 20 (non-conf teams in standings), 21-22
  (dead code) were documented but deferred as lower priority or requiring design decisions.

## 2026-04-04 (Bug Fixes: NFL Team Name and Retirement Season Count)

### Fixes and Maintenance

- **Bug 7 fix**: In `src/nfl_handlers/nfl_early.ts`, `src/nfl_handlers/nfl_peak.ts`,
  and `src/nfl_handlers/nfl_veteran.ts`, moved intro text display to after
  `buildNFLSeason()` and team name sync. Previously the player would see their old
  team name in the intro text if `buildNFLSeason` assigned a new team.
- **Bug 8 fix**: In `src/nfl_handlers/nfl_late.ts` and `src/nfl_handlers/nfl_veteran.ts`,
  moved `player.nflYear += 1` into the "Start Season" / "Play One More Season" action
  callback so it only increments when the player commits to playing. Retiring without
  playing now reports the correct season count. The season headline still shows the
  upcoming season number via `player.nflYear + 1` before the increment fires.

## 2026-04-04 (Playoff Bracket Bug Fixes)

### Fixes and Maintenance

- Fixed three bugs in [src/season/playoff_bracket.ts](src/season/playoff_bracket.ts):
  - Bug 1 (`buildBracket()` collapse): rewrote to pre-create all round shells with
    empty games arrays, then populate only round 0 with initial matchups. Later rounds
    are filled by `advanceRound()`, which already had this logic. Previously
    `remainingTeamIds = nextRoundTeams` collapsed to bye-only teams after round 1.
  - Bug 2 (bye re-insertion loop): changed `advanceRound()` bye detection to scan
    `teamsEverScheduled` across all rounds instead of only the current round's
    `teamsInRound`. This prevents a 1-seed that already played from being re-inserted
    as a bye team in later rounds.
  - Bug 3 (game ID counter reset): removed `playoffGameCounter = 0` from constructor.
    Counter is now module-level and shared across AFC and NFC bracket instances,
    preventing colliding game IDs between two simultaneously constructed brackets.

## 2026-04-04 (Documentation Refresh)

### Fixes and Maintenance

- Refreshed [docs/CODE_ARCHITECTURE.md](docs/CODE_ARCHITECTURE.md): updated overview
  to describe BitLife-style football career sim with TypeScript ES2020 compilation.
  Added milestone system documentation. Updated data flow diagram to show
  `LeagueSeason` as single source of truth. Clarified weekly engine loop with
  season model and milestone checks.
- Refreshed [docs/FILE_STRUCTURE.md](docs/FILE_STRUCTURE.md): updated source directory
  tree with all 13 handlers (3 childhood, 2 high school, 3 college, 5 NFL), season
  layer (8 files), shared utilities, and data files. Added descriptions for each
  subdirectory showing season lengths and handler responsibilities. Clarified that
  childhood is narrative-only (no football).

## 2026-04-04 (Game Balance, Recruiting Fix, Health Tuning, Milestone System)

### Additions and New Features

- **Milestone system**: Career events now fire at specific moments to break up the
  repetitive weekly loop and make each playthrough feel unique. Milestones are
  one-time story moments tracked on the player and displayed after game results.
  High School milestones: first starter, first win, first loss, rivalry game week,
  undefeated late season, recruiting interest. College milestones: first starter,
  ESPN GameDay appearance, academic trouble, NIL deal, draft buzz. NFL milestones:
  first starter, first win, 100 games played, Pro Bowl invite, contract year,
  veteran leader status, body breaking down. Implementation in `src/milestones.ts`
  with integration into weekly engine that checks and fires milestones after game
  results.

### Behavior or Interface Changes

- Weekly focus selection (Train, Film Study, etc.) now pauses for 4 seconds
  after applying stat changes before showing the activity prompt, so the player
  can see their updated stats
- Activities now show as inline buttons in the choices panel (e.g.,
  "Extra Practice (+2 TEC, -1 HP)") instead of requiring a tab switch.
  "Skip to Game Day" button appears at the bottom.
- College season shortened from 12 to 11 weeks (4 non-conf + 7 conf rounds)
  to match actual schedule content
- Games are harder to win: player contribution halved (0.3 -> 0.15), opponents
  now get a star player boost (1-6 pts) and upset bonus for underdogs (0-4 pts),
  player team strength no longer biased above opponents. Further difficulty
  tuning: player contribution multiplier reduced 0.15 -> 0.10, opponent variance
  increased -3/+3 -> -5/+5, opponents gain coaching boost 0-3 pts, logistic curve
  steepened 0.06 -> 0.07 (favors strength differential)
- Health drains slower: base weekly wear 0-2 (was 1-3), training cost 0-1
  (was 1-2), game-day starter cost 0-2 (was 1-3), injury thresholds and
  damage reduced

### Fixes and Maintenance

- **Transfer portal did not change player's team**: The "Hit the transfer portal"
  choice in `college_entry.ts` only added flavor text and advanced to next year,
  never actually transferring the player to a new school. Now properly picks a
  new NCAA school using `assignPlayerCollege()` (filtered to exclude current
  school), updates `player.teamName`, sets depth chart (backup by default, 25%
  chance starter if technique >= 70 and footballIq >= 65), records the transfer
  in `player.bigDecisions`, and updates the header before advancing to sophomore
  year.
- **College starter promotions too easy**: Year 2+ start-of-season promotion was
  triggered at technique >= 50 with confidence >= 45, causing nearly everyone to
  become starters by year 2. Now requires technique >= 65, confidence >= 55,
  footballIq >= 50, plus only 65% chance. End-of-season promotion now requires
  technique >= 60, footballIq >= 55, with 60% chance (was just technique >= 50).
- **NFL team name never set**: all 5 NFL handlers called `buildNFLSeason()` but
  never synced `player.teamName` with the actual assigned team. Player would show
  "NFL Team" or their college name instead of the real NFL team. Now all handlers
  set `player.teamName = playerTeam.getDisplayName()` after building the season.
- **Playoff bracket lost bye teams**: `advanceRound()` only collected winners from
  played games, so the 1-seed (bye in wild card) was dropped from the bracket.
  Now detects bye teams and adds them to the next round.
- **Recruiting stars stuck at 0**: `updateRecruitingStars()` computed the star
  rating but never wrote it back to `player.recruitingStars`. Now sets the value
  directly on the player object.
- **College offers now reliably appear**: senior year offer generation retries
  up to 10 times to produce 3 distinct school offers (was limited to exactly 3
  attempts with no retry on duplicates)
- Conference standings: all teams now play every conference week using a proper
  round-robin scheduler (`generateRoundRobinRounds` in `season_builder.ts`)
  - HS: 8 teams, 7 rounds of 4 games each, all teams play every round
  - College: same 8-team round-robin in weeks 5-11, no team left out
  - Previous approach scheduled player games separately from other teams,
    leaving some conference teams with few or no games
- **Non-conference games now scheduled for ALL conference teams**, not just the
  player. `buildHSSchedule()` and `buildCollegeSchedule()` now generate
  non-conference opponents for every conference team in non-conference weeks
  (HS weeks 4, 7, 10; college weeks 1-4), ensuring equal play opportunities
  and more realistic standings. Prevents some teams from playing ~2 fewer games
  than the player during those weeks.
- Added `generateRoundRobinRounds()` to `src/season/season_builder.ts` using
  the circle method: fixes one team, rotates the rest, guaranteeing every team
  plays exactly once per round with no conflicts

## 2026-04-04 (Portrait System Integration)

### Additions and New Features

- Portrait system integrated into gameplay
  - `avatarConfig` field added to Player interface in `src/player.ts`
  - Portrait generated during `createPlayer()` using player name as seed
  - Age-appropriate portrait rendered in header on every `updateHeader()` call
  - Save/load migration in `src/save.ts` generates portrait for old saves
  - `#player-portrait` container added to `index.html` header
  - Circular portrait CSS with 56px display in `styles.css`

### Behavior or Interface Changes

- Player header now shows a circular SVG portrait above the player name
- Portrait updates each year to reflect age-appropriate appearance
  (teen vs adult vs veteran facial features, hair, etc.)
- Uses the two-seed identity system: same seed produces same base identity
  across all ages (skin tone, face shape persist; hair style, expression vary)

## 2026-04-04 (Offseason Decisions in Career Handlers)

### Additions and New Features

- Added offseason choice mechanics to all 8 career phase handlers
- College freshman (college_entry.ts): 3 offseason choices affecting discipline, confidence, footballIq
  - "Hit the transfer portal" (confidence +3, discipline -2)
  - "Stay and compete for your spot" (discipline +3, technique +2)
  - "Focus on academics this summer" (footballIq +3, discipline +2)
- College soph/junior (college_core.ts): 3 training choices, with early declaration option preserved for juniors
  - "Train with a speed coach" (athleticism +3, health -1)
  - "Work on football film all summer" (footballIq +3, technique +1)
  - "Get bigger in the weight room" (technique +2, athleticism +1, health +1)
- College senior (college_senior.ts): 3 NFL Combine prep choices with draftStock modification
  - "Crush the combine with elite athleticism" (athleticism +2, draftStock +5)
  - "Impress scouts with football IQ at Pro Day" (footballIq +3, draftStock +3)
  - "Let your game tape speak for itself" (confidence +3, draftStock +2)
- NFL rookie (nfl_rookie.ts): 3 offseason plan choices including trainer investment
  - "Hire a personal trainer for the offseason" (athleticism +3, technique +1, money -100k)
  - "Study the playbook obsessively" (footballIq +4, technique +2)
  - "Enjoy the money and relax" (confidence +3, health +2, discipline -2)
- NFL early years (nfl_early.ts): 3 career development choices including contract negotiation
  - "Push for a contract extension" (money +2M, confidence +2)
  - "Focus on becoming a team leader" (leadership +4, discipline +2)
  - "Train at a position-specific camp" (technique +3, athleticism +1)
- NFL peak years (nfl_peak.ts): 3 peak-era decision choices
  - "Chase a ring - recruit free agents to your team" (leadership +3, confidence +2)
  - "Sign a massive endorsement deal" (money +5M, popularity +5, discipline -2)
  - "Give back - start a foundation" (leadership +4, popularity +3, confidence +2)
- NFL veteran years (nfl_veteran.ts): 3 veteran wisdom choices
  - "Mentor the young guys" (leadership +5, popularity +2, athleticism -1)
  - "Switch to a contending team" (confidence +3, athleticism +1, popularity -2)
  - "Restructure your contract to help the team" (leadership +3, money -1M, discipline +2)
- NFL late career (nfl_late.ts): 2 farewell tour choices before age-39 forced retirement
  - "Embrace the farewell tour" (popularity +5, confidence +3)
  - "No fanfare, just compete" (discipline +3, technique +1, confidence +1)

### Behavior or Interface Changes

- All handleSeasonEnd functions now show narrative offseason decisions with headlines
- Each choice affects different stat clusters depending on career phase and context
- Money modifications use career.money directly (signed integers: +2000000, -100000, -1000000, +5000000)
- Popularity and leadership modifications use clampStat() helper to enforce 0-100 bounds
- draftStock modifications added to senior year to affect draft outcomes
- Each choice includes ctx.addText() narrative feedback before advancing
- All choices ultimately call advanceToNextYear(player, ctx) as before

### Fixes and Maintenance

- Imported clampStat from player.js where needed in all handler files
- Ensured all stat modifications use proper functions (modifyStat for core stats, direct assignment for career stats, clampStat for hidden stats)

## 2026-04-04 (College and NFL Events)

### Additions and New Features

- Added 22 college events (phase: "college") to `src/data/events.json`
  - Academic/Social events: exam stress, professor recognition, dorm parties, NIL deals, campus fame, study groups, party consequences, rivalry atmosphere
  - Football events: film room breakthroughs, position coach feedback, conference rivalry, bowl games, spring performance, two-a-days, playbook mastery
  - Career events: NFL scouts at practice, agent contact, transfer portal, draft stock discussion, reporter interviews, senior day, college legacy
- Added 30 NFL events (phase: "nfl") to `src/data/events.json`
  - Locker room events: veteran advice, rookie mentoring, arguments, team meetings, pregame bonding
  - Media events: press conferences, viral moments, national TV games, podcast interviews, radio debates
  - Business events: endorsement deals, financial advisor meetings, charity events, contract restructures, trade demands
  - Football events: new coordinators, film study advantages, joint practices, primetime games, bye week recovery, preseason reps, playbook stress
  - Life events: family at games, big purchases, injury scares, teammate cuts, Pro Bowl voting, community service, college teammate reunions, trade deadline circus

### Behavior or Interface Changes

- Total events now 135 (up from ~83)
- College phase has 22 events for realistic college football experience
- NFL phase has 30 events spanning locker room, media, business, and lifestyle domains
- All new events use consistent format with 1 tab indentation, 2-3 stat-affecting choices
- Writing style matches existing events: punchy, vivid, BitLife-inspired tone

## 2026-04-04 (Interactive Childhood Events)

### Additions and New Features

- Added ~20 childhood events (phase: "childhood") to `events.json`
  - Toddler events (ages 1-3): first steps, daycare scuffle, playground climb
  - School events (ages 4-7): recess races, homework, bullies, talent show, report cards
  - Life events: backyard football, birthday parties, summer camp, new puppy, video games
- Added ~13 youth events (phase: "youth") to `events.json`
  - Football events: first practice, coach intensity, big hits, teammate rivalry
  - Development events: football camp, weight room, position switch, highlight play
  - Adversity events: losing streak, injury scare, grades slipping

### Behavior or Interface Changes

- Kid years (ages 1-7) now present 1-2 random events per year with choices
  - Ages 1-3 get 1 event, ages 4-7 get 2 events
  - Events affect core stats (athleticism, discipline, confidence, footballIq, health)
  - Age-appropriate headlines ("Baby steps", "Kindergarten", "First grade")
- Peewee years (ages 8-10) now present 1 youth event per year before "Continue"
- Travel years (ages 11-13) now present 1 youth event per year before "Continue"
- Events are filtered by phase and never repeat within the same year

## 2026-04-04 (Season Simulation Layer)

### Additions and New Features

- New `src/season/` layer with 8 files: authoritative season backend
  - `season_types.ts`: shared types (TeamId, GameId, GameStatus, StandingsRow)
  - `team_model.ts`: SeasonTeam class (identity + ratings, no wins/losses)
  - `game_model.ts`: SeasonGame class (atomic truth for game results)
  - `standings_model.ts`: pure function to derive standings from finalized games
  - `season_model.ts`: LeagueSeason class (single source of truth for all season state)
  - `season_builder.ts`: shared schedule helpers (round-robin, validation)
  - `season_simulator.ts`: advance weeks, simulate non-player games
  - `playoff_bracket.ts`: generic bracket (HS 4-team, college CFP, NFL 7-seed)
- Phase-specific season builders:
  - `src/high_school/hs_season_builder.ts`: 8-team conference, 10-game schedule
  - `src/college/college_season_builder.ts`: real NCAA data, 12-game schedule
  - `src/nfl_handlers/nfl_season_builder.ts`: 32 real NFL teams, 17-game schedule
- Playoff bracket system supporting HS (2-round), college (CFP), and NFL (4-round)

### Behavior or Interface Changes

- Weekly engine (`weekly_engine.ts`) now uses `LeagueSeason` as source of truth
  instead of scattered state. All game results recorded through season object.
- `startSeason()` signature changed: accepts LeagueSeason instead of ScheduleEntry[]
- `advanceWeek()` is strict: refuses if any current-week game is unfinished
- Conference teams now play each other (not phantom opponents with random strength)
- Standings derived from finalized games (never stored separately)
- Team tab standings and schedule now read from LeagueSeason queries
- New `getActiveSeason()` export from weekly engine for UI consumption

### Fixes and Maintenance

- Fixed bench-stuck bug: `evaluateDepthChartUpdate()` now has bench -> backup
  promotion path. Previously, bench players had no way to move up during game
  weeks because `runPracticeSession()` was defined but never called.
- All 10 football handler files updated to use proper season builders
- NFL season builder includes per-season strength variance for all 32 teams

### Decisions and Failures

- Design choice: games are the atomic truth, standings always derived. This
  eliminates the class of sync bugs where record != games played.
- Design choice: hard cutover per phase. Old conference/standings mutation code
  coexists only until UI is fully rewired, then deleted.
- Save/load limitation: mid-season save recreates season on resume (handler
  rebuilds). Full season persistence deferred to future work.
- Kept `player.currentWeek` as mirrored save/UI field (season is authority).

## 2026-04-04 (Handler Season Builder Integration)

### Additions and New Features

- Patch 1: Updated all college handlers to use proper `buildCollegeSeason()` builder
  - `src/college/college_entry.ts`: now uses buildCollegeSeason() instead of legacy shim
  - `src/college/college_core.ts`: now uses buildCollegeSeason() instead of legacy shim
  - `src/college/college_senior.ts`: now uses buildCollegeSeason() instead of legacy shim
  - All handlers look up player school from NCAA data and pass full school + allSchools to builder
  - Removed imports of `generateHighSchoolTeam()` and `buildSeasonFromLegacySchedule()`
- Patch 2: Updated all NFL handlers to use proper `buildNFLSeason()` builder
  - `src/nfl_handlers/nfl_rookie.ts`: now uses buildNFLSeason() instead of legacy shim
  - `src/nfl_handlers/nfl_early.ts`: now uses buildNFLSeason() instead of legacy shim
  - `src/nfl_handlers/nfl_peak.ts`: now uses buildNFLSeason() instead of legacy shim
  - `src/nfl_handlers/nfl_veteran.ts`: now uses buildNFLSeason() instead of legacy shim
  - `src/nfl_handlers/nfl_late.ts`: now uses buildNFLSeason() instead of legacy shim
  - All handlers call buildNFLSeason(playerTeamName) and extract playerTeam strength
  - Removed imports of `generateHighSchoolTeam()` and `buildSeasonFromLegacySchedule()`

## 2026-04-04 (Year-Handler Registry Architecture)

### Additions and New Features

- Patch 1: YearHandler and CareerContext interfaces in `src/core/year_handler.ts`
  - YearHandler: id, ageStart, ageEnd, startYear(), optional getSeasonConfig() and endYear()
  - CareerContext: story-oriented output only (no DOM manipulation)
  - SeasonConfig: season length, football flag, depth chart, event chance, opponent strength
  - WeekAdvanceResult discriminated union: `{ kind: "next_week" }` or `{ kind: "season_ended" }`
- Patch 2: Year registry in `src/core/year_registry.ts`
  - `registerHandler()` with overlap validation
  - `getHandler(age)` lookup for ages 1-39
  - 13 age-band handlers registered via `src/core/register_handlers.ts`
- Patch 3: Year runner in `src/core/year_runner.ts`
  - `advanceToNextYear()`: increment age, dispatch to handler
  - `startYear()`: resume game at current age
  - Age-advance convention: current age finishes -> offseason -> increment -> next handler starts
- Patch 4: Player model extension in `src/player.ts`
  - New persistent identity fields: townName, townMascot, hsName, hsMascot
  - New NFL identity fields: nflTeamId, nflConference, nflDivision
  - New college fields: isRedshirt, eligibilityYears
  - Save/load migration in `src/save.ts` with defaults for all new fields
- Patch 5: Shared year helpers in `src/shared/year_helpers.ts`
  - `applyAgeDrift()`: age-appropriate stat growth/decline curves for all bands
  - `coachAssignPosition()`: position assignment based on size + athleticism
- Patch 6: Weekly engine in `src/weekly/weekly_engine.ts`
  - Extracted from game_loop.ts with guaranteed week advancement contract
  - Every code path through the weekly loop increments week or ends season
  - State machine: focus -> activity -> event -> game -> next_week/season_ended
  - Backup players go through the full weekly loop (no skips or stuck states)
  - Season state is transient (not on Player): wins, losses, weekState, schedule
- Patch 7: HS handlers wired to weekly engine
  - `src/high_school/hs_frosh_soph.ts`: ages 14-15, generates HS identity, 10-game season
  - `src/high_school/hs_varsity.ts`: ages 16-17, driver license at 16, recruiting stars
- Patch 8: College handlers wired to weekly engine
  - `src/college/college_entry.ts`: age 18, redshirt support, 12-game season
  - `src/college/college_core.ts`: ages 19-20, early declaration option for juniors
  - `src/college/college_senior.ts`: age 21, graduation, mandatory draft declaration
- Patch 9: NFL handlers wired to weekly engine
  - `src/nfl_handlers/nfl_rookie.ts`: age 22, rookie salary
  - `src/nfl_handlers/nfl_early.ts`: ages 23-26, salary based on depth chart
  - `src/nfl_handlers/nfl_peak.ts`: ages 27-31, peak salary
  - `src/nfl_handlers/nfl_veteran.ts`: ages 32-36, retirement option, decline tracking
  - `src/nfl_handlers/nfl_late.ts`: ages 37-39, forced retirement check, farewell
- Patch 10: Childhood handlers (stub with Continue buttons)
  - `src/childhood/kid_years.ts`: ages 1-7, BitLife-style event stubs
  - `src/childhood/peewee_years.ts`: ages 8-10, town name/mascot generation
  - `src/childhood/travel_years.ts`: ages 11-13, same town identity

### Behavior or Interface Changes

- New architecture: persistent Player + functional year-handler registry replaces monolithic
  phase modules. Each age band (13 total) has its own handler file.
- Weekly engine guarantees advancement: every path ends in next_week or season_ended.
- Handlers are thin: set up year, call shared helpers, trigger transitions. No rendering or
  save logic inside handlers.
- CareerContext is story-oriented only: addHeadline, addText, addResult, showChoices,
  showEventModal. No DOM manipulation.

- Patch 11: Integration wiring in `src/main.ts`
  - `registerAllHandlers()` called at init
  - `CareerContext` adapter bridges story helpers to handler system
  - New game flow: birth story -> year_runner -> kid_years handler (age 1)
  - Resume flow: startYear() dispatches to correct handler for player's current age
  - HS entry: position selection -> startYear() on frosh/soph handler
  - Tab switch: uses new `getSeasonRecord()` from weekly engine when active
- Patch 12: [docs/AGE_PROGRESSION.md](docs/AGE_PROGRESSION.md) documenting full life progression
  - All 13 age bands with handler, phase, season structure
  - Milestones, position evolution rules, stat growth curves
  - College offer tiers, redshirt mechanic, offseason decisions
  - Retirement triggers, NFL salary by era, weekly engine contract
  - File map for new architecture

### Fixes and Maintenance

- Refreshed [docs/CODE_ARCHITECTURE.md](docs/CODE_ARCHITECTURE.md) to reflect year-handler
  registry architecture: added core engine, weekly engine, age-band handler, and shared helper
  sections. Marked legacy phase modules. Updated data flow and extension points.
- Refreshed [docs/FILE_STRUCTURE.md](docs/FILE_STRUCTURE.md) with new subdirectories (core/,
  childhood/, high_school/, college/, nfl_handlers/, weekly/, shared/), grouped documentation
  map into subsections, and updated "where to add new work" for handler pattern.
- Refreshed [README.md](README.md): grouped documentation links into subsections (game design,
  developer reference, style guides), added missing doc links (AGE_PROGRESSION, PORTRAIT_SYSTEM),
  corrected license section to reference both license files.

### Decisions and Failures

- Design choice: functional registry, not class inheritance. Shared helpers serve as "base."
- Design choice: no redundant year counters on Player (age implies band).
  Removed proposed peeweeYear, travelYear, hsYear fields.
- Design choice: WeekAdvanceResult discriminated union forces callers to handle both outcomes.
  This prevents the infinite-loop/stuck-at-age-14 bug from the old architecture.
- Old phase modules (hs_phase.ts, college_phase.ts, nfl_phase.ts, game_loop.ts) are still
  present. They will be removed only after new handlers reach feature parity.
- NFL schedule currently uses generateHighSchoolTeam() as placeholder. Real NFL team/division
  schedule generation is planned for a future patch.

## 2026-04-04

### Fixes and Maintenance

- Standardized [README.md](README.md): added project overview, quick start, documentation links, status, and maintainer
- Created [docs/CODE_ARCHITECTURE.md](docs/CODE_ARCHITECTURE.md): system design, layered architecture, data flow, and extension points
- Created [docs/FILE_STRUCTURE.md](docs/FILE_STRUCTURE.md): directory layout, source file purposes, and generated artifacts
- Bug fix: `player.teamStrength` was never set during college or NFL phases, staying at default 50
  - College phase now syncs `player.teamStrength` from `collegeTeam.strength` when team is created
  - NFL phase now sets `player.teamStrength` during draft
  - This affected bowl game eligibility (college.ts:339) and NFL win calculations (nfl.ts:151)
- Bug fix: `player.draftStock` was 0 until junior year; now initialized at college entry via `calculateDraftStock()`
- Bug fix: removed unused `LAYER_POSITIONS` import from [src/avatar.ts](src/avatar.ts)
- Bug fix: normalized fetch path in [src/events.ts](src/events.ts) from `./src/data/events.json` to `src/data/events.json` for consistency with other fetch calls

### Additions and New Features

- Patch 1: Architecture doc block and section headers added to [src/main.ts](src/main.ts)
  - Defines main.ts as orchestrator; business logic belongs in phase modules
  - Named section headers: GLOBALS, TAB SWITCHING, GAME INIT, CHILDHOOD/YOUTH, HS ENTRY, PHASE TRANSITIONS, STORY HELPERS, RETIREMENT, ENTRY POINT
- Patch 2: Split `generateRunnerReceiverStats()` into three position-specific generators in [src/week_sim.ts](src/week_sim.ts)
  - RB: `rushYards`, `carries`, `rushTds`, `fumbles`
  - WR: `receptions`, `recYards`, `recTds`, `targets`
  - TE: `receptions`, `recYards`, `recTds`, `blockGrade` (A-F hybrid)
  - Design decision: TE is a true hybrid with blocking grade, not a slower WR
- Patch 3: Position-specific game narratives in `generateGameStory()`
  - RB: "rushed for X yards on Y carries"
  - WR/TE: "caught X passes for Y yards"
  - TE mentions blocking grade in narrative
- Patch 4: Per-position output definitions in [src/data/positions.json](src/data/positions.json)
  - Added `positionOutputs` under `runner_receiver` with RB, WR, TE sub-entries
- Patch 5: Stat label formatting via `formatStatLine()` in [src/ui.ts](src/ui.ts)
  - Maps camelCase keys to readable labels (e.g., `rushYards` -> `Rush Yards`)
  - Applied in all 6 stat display sites across hs_phase, college_phase, nfl_phase
- Patch 6: Context-driven depth chart scaling in [src/week_sim.ts](src/week_sim.ts)
  - Bench usage scales with game context: blowout (14+ pts) = more snaps, close (<7) = fewer
  - Bench QB shows DNP in close games, garbage-time stats in blowouts
  - Backup gets ~35-50% volume depending on game context
- Patch 7: `excludes_flag` feature in [src/events.ts](src/events.ts)
  - Prevents events from firing when a flag is already set in player storyFlags
- Patch 8: One-time events tagged with `excludes_flag` in [src/data/events.json](src/data/events.json)
  - Driver's license: `excludes_flag: "has_drivers_license"`
  - Recruiting commitment events: `excludes_flag: "committed_to_college"`
  - Transfer event: `excludes_flag: "transferred_high_school"`
- Patch 9: `SeasonStatTotals` interface and `seasonStats` field on Player in [src/player.ts](src/player.ts)
  - Common totals (gamesPlayed, totalYards, totalTouchdowns) plus position-specific fields
  - Save/load migration in [src/save.ts](src/save.ts) defaults to empty stats for old saves
- Patch 10: Stat accumulation wired into all phase game loops
  - `accumulateGameStats()` called after each game in hs_phase, college_phase, nfl_phase
  - Season stats reset at each season start via `createEmptySeasonStats()`

### Behavior or Interface Changes

- Stat lines now display formatted labels instead of raw camelCase keys
- RB, WR, and TE each produce distinct stat lines matching their real football role
- Bench players see context-appropriate limited stats instead of empty stat lines
- Driver's license and recruiting events no longer repeat after being completed

### Decisions and Failures

- TE designed as true hybrid (receiving + blocking grade) per user preference, not a slower WR
- Bench stats are context-driven (blowout vs close game), not a flat percentage
- Season stat tracking is groundwork only; predictive progression deferred to future plan
- `excludes_flag` applied selectively to true one-time events; state markers like `is_team_captain` left repeatable

## 2026-04-04 (NFL Phase Extracted to Module)

### Additions and New Features

- NFL football phase loop extracted from main.ts to [src/nfl_phase.ts](src/nfl_phase.ts)
  - New module export: `startNFLCareer(context, onRetire)` entry point for draft day and career start
  - Encapsulates NFL state: `nflTeam`, `nflConference`, `NFL_SEASON_WEEKS = 17`, `currentSeasonStats`
  - Exported getters: `getNFLTeam()`, `getNFLConference()` for tab refresh in main.ts
  - Functions: `startNFLSeason()`, `startNFLWeek()`, `handleNFLWeeklyFocus()`, `proceedToNFLGame()`, `endNFLSeason()`
  - Draft day logic integrated: draft stock -> round assignment, team selection, palette application
  - Uses shared game loop functions: `showWeeklyFocusUI()`, `handleWeeklyFocus()`, `proceedToEventCheck()`
  - All internal functions are private (not exported); only `startNFLCareer()` and getters are public API
  - Retirement check delegates to `checkRetirement()` from nfl.ts, triggers `onRetire()` callback

### Behavior or Interface Changes

- NFL loop now modularized for separation of concerns (architecture refactor, no user-facing changes)

## 2026-04-04 (HS Phase Extracted to Module)

### Additions and New Features

- High school football phase loop extracted from main.ts to [src/hs_phase.ts](src/hs_phase.ts)
  - New module export: `startHighSchoolSeason()` entry point for season gameplay
  - Setup function: `initHighSchoolPhase(context, beginCollegeCallback)` to inject context and callback
  - Encapsulates HS state: `persistentHSTeam`, `hsConference`, `wonStateThisSeason`,
    `currentSeasonStats`, `allEvents`, `onBeginCollege` callback
  - Exported constant: `HS_SEASON_WEEKS = 10` for week tracking
  - Functions: `startHighSchoolSeason()`, `startPreseason()`, `preseasonFirstScrimmage()`,
    `startWeek()`, `proceedToGameDay()`, `endSeason()`, `startPlayoffs()`,
    `playPlayoffGame()`, `preparePlayoffGame()`, `completeSeasonSummary()`, `graduateHighSchool()`
  - Uses shared game loop functions: `showWeeklyFocusUI()`, `handleWeeklyFocus()`,
    `proceedToEventCheck()`, `resetWeekState()`, `getWeekState()`
  - All internal functions are private (not exported); only `startHighSchoolSeason()`
    and `initHighSchoolPhase()` are public API
  - HS season flow: preseason (tryouts/scrimmage) -> 10 regular weeks -> playoffs
    (if 6+ wins) -> season summary -> graduation (at age 18)
  - Season awards: All-Conference (avg stat >= 60), All-State (avg stat >= 75)
  - Recruiting stars calculated at season end (ages 16+) based on overall rating
  - Player of the Week probability: elite 15-25%, great 5-12%, good 1-3%
  - Playoff difficulty scaling: regional 65-80, semifinal 78-92, final 88-98 (opponent strength)
  - State championship flag prevents duplicate "STATE CHAMPIONS!" messages within one season

### Behavior or Interface Changes

- HS loop now modularized for separation of concerns (architecture refactor, no user-facing changes)
- Graduation transition to college now uses callback pattern instead of direct function call

## 2026-04-04 (College Phase Extracted to Module)

### Additions and New Features

- College football phase loop extracted from main.ts to [src/college_phase.ts](src/college_phase.ts)
  - New module export: `beginCollege(context, ncaaSchools, onStartNFLCareer)` entry point
  - Encapsulates college state: `collegeTeam`, `currentConference`, `playerNCAASchool`, `COLLEGE_SEASON_WEEKS`
  - Functions: `startCollegeSeason()`, `startCollegeWeek()`, `handleCollegeWeeklyFocus()`, `proceedToCollegeGame()`, `endCollegeSeason()`, `declareForDraft()`
  - Uses shared game loop functions: `showWeeklyFocusUI()`, `handleWeeklyFocus()`, `proceedToEventCheck()`
  - Integrates NCAA school assignment, team palette generation, NIL deals, and draft declaration
  - All internal functions are private (not exported); only `beginCollege()` is public API

### Behavior or Interface Changes

- College loop now modularized for separation of concerns (architecture refactor, no user-facing changes)

## 2026-04-04 (Tab Navigation + Activities Hub + NFL Weekly Loop)

### Additions and New Features

- Bottom tab bar navigation system ([src/tabs.ts](src/tabs.ts), new module)
  - Phase-adaptive tabs: childhood/youth get 3 tabs (Life, Stats, Activities),
    HS/college/NFL get 5 tabs (Life, Stats, Activities, Team, Career),
    legacy gets 3 tabs (Life, Stats, Career)
  - `switchTab()`, `updateTabBar()`, `showTabBar()`/`hideTabBar()` exported for game loop
  - Tab bar hidden during event modals and character creation
  - Active tab highlighted with gold accent border
  - 48px touch targets, safe-area-inset support for mobile

- HTML restructured into 5 tab panels (`index.html`)
  - `#tab-life`: story panel + choice buttons (default view, where the game happens)
  - `#tab-stats`: 7 stat bars + summary info (money, record, position, depth chart)
  - `#tab-activities`: phase-dependent activity menu with action cap
  - `#tab-team`: team name, record, conference standings, schedule, coach personality
  - `#tab-career`: phase-aware career info (recruiting in HS, draft stock in college,
    contract/salary/awards in NFL, full summary in legacy)
  - Old inline stats panel moved from always-visible to Stats tab (story panel gains space)
  - Old standings/schedule toggle buttons and status bar footer removed

- Activities hub system ([src/activities.ts](src/activities.ts), new module)
  - 15 activities across 3 phases, each with trade-offs (no dominant choice):
    - HS (5): Extra Practice (+TEC -HP), Weight Room (+ATH -HP), Study Hall (+DIS),
      Hang with Friends (+CON -DIS), Rest and Recover (+HP)
    - College (5): Position Drills (+TEC -HP), Film Study (+IQ), NIL Meeting (+money -DIS,
      sophomore+), Team Bonding (+CON), Recovery Session (+HP)
    - NFL (5): Advanced Training (+TEC -HP), Film Breakdown (+IQ),
      Endorsement Deal (+money -DIS), Media Appearance (-CON), Recovery/Rehab (+HP)
  - NIL meetings award $500-$2500, endorsement deals award $10K-$60K
  - `WeekPhase` state machine: `focus -> activity_prompt -> activity_done -> event -> game -> results`
  - `WeekState` object tracks phase, actions used, and action budget (transient, not on Player)
  - Action cap: 1 optional activity per week during season
  - Activities tab read-only outside `activity_prompt` phase
  - Locked activities shown grayed out with unlock hint text

- Weekly loop integration for all three football phases
  - New flow: weekly focus -> activities prompt -> event check -> game day -> results
  - "Activities" button switches to Activities tab; "Skip to Game Day" proceeds directly
  - Activity results append to Life tab story log (story-first design)
  - `proceedToEventCheck()` shared function handles event filtering and phase routing
    for HS, college, and NFL with fallback chain (NFL -> college -> HS events)

- NFL weekly loop expansion (replaces old season-by-season approach)
  - 17-week regular season matching real NFL schedule length
  - Same weekly rhythm as HS/college: focus -> activities -> event -> game -> results
  - `startNFLSeason()`: generates 17-game schedule, applies age-based stat decline,
    creates NFL conference for standings
  - `startNFLWeek()`: shows opponent, resets weekly state, prompts for focus
  - `proceedToNFLGame()`: simulates individual game using shared `simulateGame()` engine,
    tracks stats, updates standings, shows result
  - `endNFLSeason()`: salary calculation, Pro Bowl/All-Pro awards, starter promotion,
    retirement check with "Retire" or "One More Season" options
  - NFL opponent strength ranges 55-95 (higher than college)
  - Age decline applied once per season: bell curve peaks at 27, declines after 30
  - Prime growth (under 30): technique and IQ improve slightly each season
  - NFL team generated with `generateNFLSeasonTeam()` using all 32 real team names

- Tab content rendering functions added to [src/ui.ts](src/ui.ts)
  - `updateStatsTab()`: stat bars + summary rows (money, record, position, depth chart)
  - `updateTeamTab()`: team header, coach, conference standings, season schedule
  - `updateCareerTab()`: phase-aware career info with sub-renderers per phase
  - `renderActivitiesTab()`: activity cards with effect previews, action cap, locked states
  - Content refreshes on tab switch via `setOnTabSwitch()` callback in tabs.ts

### Behavior or Interface Changes

- Stats panel no longer always visible; moved to Stats tab to give story panel more space
- Old footer status bar (`#status-bar`) removed; record and recruiting info moved to tabs
- Old standings/schedule toggle buttons removed; content now in Team tab
- NFL phase upgraded from season-by-season to week-by-week gameplay
- `resumeGame()` for NFL phase now resumes with `startNFLSeason()` instead of old
  `playNFLSeason()`

### Fixes and Maintenance

- Added `CareerPhase` to main.ts imports (was missing, caused compile errors)
- Fixed `simulateGame()` call in NFL to pass required `team` argument
- Fixed stat line display to use correct keys from `playerStatLine` record
  (`passYards`, `rushYards`, `tackles`, etc. instead of generic `yards`/`touchdowns`)
- Added NFL conference (`nflConference`) and NFL team (`nflTeam`) module-level state
- Dead code from old season-by-season NFL approach marked for cleanup

### Developer Tests and Notes

- TypeScript compilation succeeds with `npx tsc --noEmit` after all changes
- New files: `src/tabs.ts` (179 lines), `src/activities.ts` (271 lines)
- Modified files: `src/main.ts` (+684 lines net), `src/ui.ts` (+472 lines),
  `index.html` (restructured), `styles.css` (tab bar + activity card styles)
- Total codebase: 9213 lines across 15 TypeScript source files
- main.ts remains the largest file at 3471 lines; future work should extract phase
  loops into separate modules (`hs_loop.ts`, `college_loop.ts`, `nfl_loop.ts`)
- All three football phases now share the same weekly rhythm, WeekPhase state machine,
  tab layout, game engine, and activities system
- NFL events currently fall back to HS events (no NFL-specific events in events.json yet)
- Childhood/youth Activities tab shows placeholder; interactive activities begin in HS

## 2026-04-04

### Fixes and Maintenance

- Added modular SVG portrait headshot system (standalone, no game integration yet)
  - `src/avatar.ts`: portrait generation module
    - `AvatarConfig` interface for face configuration (skin, hair, eyes, brows, nose, mouth, optional facial hair/accessories)
    - `generatePortraitSVG(config)` assembles layered SVG from parts with color replacement
    - `randomAvatarConfig(seed, opts)` generates deterministic portraits from seed strings (same seed = same face)
    - Per-render SVG ID prefixing prevents collisions when multiple portraits on same page
    - Age-weighted facial hair: 0% under 20, 15% for 20-30, 40% for 30+
    - Fallback to default parts when a key is missing from the registry
  - `src/data/avatar_parts.ts`: extracted Avataaars SVG parts (MIT, Pablo Stanley)
    - 7 skin tones, 10 hair colors, ~40 curated headshot parts across 8 categories
    - Generated by `tools/extract_avataaars.py` from AvataaarsJs vanilla JS source
    - Curated allowlists filter to game-appropriate parts (skip dizzy eyes, vomit mouth, etc.)
  - `avatar_test.html`: standalone test page for previewing generated portraits
    - Grid of 12 character portraits with named NPC seeds
    - Seed repeatability check (enter same seed twice, get identical portraits)
    - Randomize button for visual variety testing

### Fixes and Maintenance

- Patch 10: Made ui.ts canonical and removed duplicate UI functions from main.ts
  - Deleted local `showChoices()`, `updateStatBar()`, `updateAllStatBars()`, and `updateHeader()` functions from main.ts (lines 907-1012)
  - Removed local `ChoiceOption` interface and imported type from ui.js
  - Updated all call sites in main.ts to use `ui.showChoices()`, `ui.updateAllStats()`, `ui.updateHeader()`
  - ui.ts functions are now the single source of truth for UI rendering
  - All stat bar updates, header updates, and choice button displays now go through canonical ui.ts implementations
  - Compilation verified with `npx tsc --noEmit`

- Patch 11: Wired nfl.ts into main.ts NFL game loop
  - Added imports from nfl.ts: `simulateNFLSeason`, `getNFLMidseasonEvent`, `applyNFLEventChoice`, `checkRetirement`
  - Removed module-level `nflYear` variable; now using `currentPlayer.nflYear` field (Player interface already had this)
  - Replaced inline NFL season simulation in `playNFLSeason()` with call to `nfl.ts::simulateNFLSeason()` for consistent formula
  - Replaced inline NFL event generation with `nfl.ts::getNFLMidseasonEvent()` (signature compatible but more comprehensive)
  - Replaced inline retirement logic with `nfl.ts::checkRetirement()` for consistent aging/health checks
  - Updated all references from module-level `nflYear` to `currentPlayer.nflYear` (6 instances in playNFLSeason and retirePlayer)
  - Updated event choice handler to use `applyNFLEventChoice()` from nfl.ts for consistent stat effect application
  - Compilation verified with `npx tsc --noEmit`

- Previous fixes:

- Fixed 2 NCAA schedule generation bugs in `src/ncaa.ts` and `src/team.ts`
  - **Bug M2 (NCAA conference game week collisions)**: Conference games in `generateCollegeSchedule()` were assigning random weeks 4-12 with no uniqueness check, allowing multiple games on the same week. Fixed by pre-creating unique week array `[5, 6, 7, 8, 9, 10, 11, 12]`, shuffling with Fisher-Yates algorithm, and assigning one week per game. Added helper function `shuffleArray()` for array randomization.
  - **Bug M3 (HS schedule length vs season weeks mismatch)**: High school team generation in `generateHighSchoolTeam()` created `randomInRange(10, 12)` games, but the season is fixed at 10 weeks (`HS_SEASON_WEEKS = 10` in main.ts). Games beyond week 10 are never played. Fixed by hardcoding schedule length to 10 with comment noting alignment to `HS_SEASON_WEEKS`. Updated assertion to match.

- Fixed 2 college season simulation bugs in `src/college.ts`
  - **Bug H3 (negative losses)**: Clamped wins to 0-12 range before computing losses. With high athleticism, `randomInRange(-2, 2)` could produce 15+ wins, resulting in -3 losses. Now `clampedWins = Math.min(12, Math.max(0, wins))` ensures losses always non-negative. Used `clampedWins` throughout function for consistency.
  - **Bug H6 (draft stock ceiling too low)**: Removed `/2` divisor and adjusted weights in `calculateDraftStock()`. Old formula maxed at ~73 (below 85 first-round threshold). New formula: 0.30*athleticism + 0.25*technique + 0.15*footballIq + 0.10*confidence + 4*size + 0.10*leadership + 0.05*popularity. Max-stat player (100s) now reaches ~95, average player (50s) reaches ~45-55. Added explanatory comments on formula intent and expected ranges.

- Fixed 3 theme color bugs in `src/theme.ts`
  - **Bug M6**: `generateNFLPalette()` now creates a copy of NFL_TEAMS palette before mutating (prevents permanent modification of shared constant)
  - **Bug M8**: Added missing `--button-hover` CSS variable in `applyPalette()` (was used in styles.css but never set)
  - **Bug M9**: Accent colors now preserve hue and saturation from team palette instead of always producing gray (changed `hslToHex(0, 0, ...)` to use extracted accent color values)
  - Added helper function `rgbToHsl()` to convert RGB back to HSL for color extraction
  - Updated `tsconfig.json` to include explicit lib configuration (`ES2020`, `DOM`) for better type compatibility

- Fixed 8 academic events missing `conditions` key to prevent TypeError in event filter
  - Added empty `conditions: {}` to: `big_test_tomorrow`, `teacher_offers_tutoring`, `report_card_day`, `homework_piling_up`, `group_project_slacker`, `skipping_class`, `school_newspaper_feature`, `detention`
  - These events previously crashed the event filter when accessing `event.conditions.min_week`
- Fixed `injury_teammate_gets_hurt` event requiring impossible `has_close_teammate` flag
  - Removed `requires_flag: "has_close_teammate"` from conditions (no event in game sets this flag)
  - Event can now fire based on week constraints alone

## 2026-04-04 (NCAA Conference & Schedule Integration)

### Additions and New Features

- Integrated NCAA conference system into main game loop
  - Added module-level state: `ncaaSchools`, `currentConference`, `hsConference`
  - NCAA schools data loaded in `initGame()` from `ncaa.ts::loadNCAASchools()`
  - Modified `beginCollege()` to use real NCAA schools: calls `assignPlayerCollege()` and `formatSchoolName()` to assign player to real college based on recruiting stars
  - College phase now generates conference standings via `generateConference()` and updates them each game with `simulateConferenceWeek()`
  - Added to imports from team.ts: `Conference`, `generateConference`, `simulateConferenceWeek`, `formatStandings`
  - Added to imports from ncaa.ts: `loadNCAASchools`, `assignPlayerCollege`, `formatSchoolName`, `generateCollegeSchedule`, `NCAASchool`

- Integrated conference standings into high school phase
  - Modified `startHighSchoolSeason()` to generate HS conference on first season and reset each subsequent year
  - HS game results now call `simulateConferenceWeek()` to update conference standings alongside team record

- Standings and schedule button UI integration
  - Added `setupStatusPanelListeners()` function wired to stadium toggle buttons (#standings-toggle, #schedule-toggle)
  - Standings button displays conference standings via `ui.toggleStandings()` (shows correct conference for HS or college)
  - Schedule button displays team schedule via `ui.toggleSchedule()` with week indicator and past results
  - Button listeners set up in `initGame()` after NCAA data loads

- Modified college game result flow
  - `proceedToCollegeGame()` now calls `simulateConferenceWeek()` after each college game to update other teams
  - Conference standings updated with correct player team name and win/loss

### Fixes and Maintenance

- Refactored `proceedToGameDay()` to extract win/loss boolean (`playerWon`) and use for both stats and conference updates
- Refactored `proceedToCollegeGame()` to extract win/loss boolean for consistency

### Developer Tests and Notes

- TypeScript compilation succeeds with all new imports and module-level state additions
- Fallback to `startCollege()` preserved if NCAA data fails to load (network error)
- Conference standings display player's team with `>>>` prefix highlighting via `formatStandings()`
- Schedule display shows week number, opponent name, and past game results for played games
- Buttons check for null state before calling display functions to prevent runtime errors

## 2026-04-04

### Additions and New Features

- Team color theming system for dynamic UI re-theming
  - Created new `src/theme.ts` module with `TeamPalette` interface for team colors
  - Implemented `generateTeamPalette()` to generate random team color schemes with WCAG AA contrast compliance
  - Implemented `generateNFLPalette(teamName)` to return real NFL team colors for 32 teams (fallback to random generation for unknown teams)
  - Implemented `applyPalette(palette)` to dynamically set CSS custom properties for theming
  - Implemented `resetToDefault()` to return to original dark theme
  - Color generation uses HSL model for consistent hue-based palettes with dark backgrounds
  - Contrast validation ensures text readability (4.5:1 WCAG AA ratio for body text)
  - Added color helper functions: `getRelativeLuminance()`, `getContrastRatio()`, `hslToHex()`
  - All CSS variables in `:root` now support dynamic theme updates
- Added `teamPalette: TeamPalette | null` property to Player interface
  - Persists selected team colors across game sessions via save/load
  - Initialized to null in `createPlayer()`

### Developer Tests and Notes

- TypeScript compilation succeeds with all new theme functions and Player interface changes
- NFL team palette map includes 32 real teams with approximate brand colors (Cowboys, Packers, Chiefs, 49ers, Seahawks, etc.)
- Color generation tested with hslToHex conversion and contrast ratio calculations
- CSS custom properties map: primary/secondary/accent backgrounds, text colors, button colors, bar colors, accent highlights
- Stat bar colors (green/yellow/red) remain consistent across themes
- All Player object literals in college.ts and nfl.ts tests updated with `teamPalette: null`

## 2026-04-05

### Additions and New Features

- Integrated CSV name files for character creation
  - Added `loadNameLists()` async function to fetch and parse first_names.csv (616 names) and last_names.csv (571 names)
  - Module-level `firstNameList` and `lastNameList` arrays now populated from CSV on game startup
  - Falls back to hardcoded DEFAULT_FIRST_NAMES and DEFAULT_LAST_NAMES if CSV loading fails (network error, missing file)
  - Made `initGame()` async to load name lists before showing welcome screen
  - Random name button in character creation now draws from full CSV lists instead of 35-name hardcoded arrays
  - Significantly expands name diversity for generated characters

- Updated team theming so the full page background uses multiple active palette colors
  - `html, body` now render a layered gradient using the current team or school palette
  - Theme-derived card and button surfaces now stay within the active palette instead of shifting to grayscale
  - School and NFL phases now read more clearly as team-colored screens rather than a single flat background

### Fixes and Maintenance

- Fixed high school season start/resume creating endless new-season loops
  - Added a guard so the async high-school season setup cannot be double-started by repeated clicks
  - Added `resumeHighSchoolSeason()` so saved high-school careers continue their current season instead of always starting a fresh one
  - This prevents accidental season-count inflation from both rapid clicks and the old high-school resume path

- Fixed the main Life screen record/next-opponent status to use the real phase team state
  - High school and college phase modules now expose getters for their active team and conference
  - The main page no longer relies on stale `main.ts` team placeholders, so record and next opponent now populate correctly during season play

- Fixed the no-youth-football path so it still reaches high school
  - Players who decline the youth league now transition into high school football at age 14 instead of aging forever in the childhood loop
  - The game now presents a direct high-school tryout choice once the skipped-youth path reaches high-school age

- Guaranteed at least one real high-school game opportunity for season-long backups
  - High school backups who remain buried on the depth chart now get a late-season showcase start instead of spending the entire season without a real shot
  - The showcase game can still turn into a genuine promotion if the player performs well enough
  - If the player does not earn the job, the game now says so explicitly rather than silently leaving them stuck

- Added weekly practice reps for backups across football phases
  - Non-starters now get a practice grade each week after choosing their focus in high school, college, and the NFL
  - Strong practice weeks can move a bench player up to backup or a backup up to starter before game day
  - This gives backups a real in-season path to earn playing time instead of only waiting for season-end promotion logic

- Added a hard NFL career cap to prevent extreme 30-season loops
  - NFL careers now force retirement after 15 seasons even if age and health checks have not yet ended the run
  - The stalled-backup cutoff was also tightened so long-term backups are retired sooner instead of being allowed to drift for many extra years

- Added a stop condition for stalled long-term NFL backup careers
  - NFL players who remain backups for too many seasons without breaking through no longer get infinite `Next Season` loops
  - After an extended backup run with no real promotion-level performance, the league stops offering another season and the career moves to retirement

- Expanded the first-name pool with more classic boy names
  - Added more traditional male names such as `Barney`, `Jackson`, `James`, `Joe`, `John`, `Joseph`, `Josh`, `Leon`, `Leonard`, `Melvin`, `Nathan`, and `Neil`
  - Existing names were preserved; the random-name generator now has more normal/classic male options mixed into the CSV source list

- Added player-selected college choice at graduation
  - High school graduation now routes through a college-selection screen instead of auto-assigning a school
  - Players can choose between a bigger program, a balanced fit, or a smaller school with an immediate starting opportunity
  - College startup now accepts the selected school and initial depth-chart role so prestige and playing-time tradeoffs are reflected in gameplay

- Fixed driver's-license event age text and repeat behavior
  - The event description no longer incorrectly says "You're finally 16" when it fires later in high school
  - Added event-filter support for `forbids_flag` conditions
  - The driver's-license event now stops appearing after the player has already passed and gained the `has_drivers_license` flag

- Fixed high school recruiting feedback so stars and offers are visible and real
  - High school season summaries now update recruiting stars through the shared recruiting formula instead of ad hoc local logic
  - College offers are now generated into `player.collegeOffers` during recruiting years and surfaced in the season summary text
  - The Career tab now explicitly notes that recruiting updates begin in junior year if the player is still too young for offers

- Fixed overtime games keeping the tied regulation score as the final
  - Shared game simulation now adds actual overtime points to the winning team instead of only flipping the win/loss result
  - Overtime story text now reports both the tied end-of-regulation score and the final overtime score
  - Example flow is now `Regulation ended tied 23-23. After overtime, you won 27-23.`

- Added stat previews to weekly focus choices on the main screen
  - Weekly options like Train, Film Study, Recovery, Social, and Teamwork now show their stat effects directly in the button text
  - Players no longer need to open the Stats tab just to remember what each weekly focus upgrades
  - Teamwork explicitly notes that it boosts leadership, which remains a hidden stat

- Added current team record and next opponent to the main Life screen
  - The Life tab now shows a compact season-status strip above the story log
  - When the player is on a team, it displays the current record and the next unplayed opponent without needing to open the Team tab
  - Offseason and non-team phases fall back to simple placeholder text

- Added college transfer portal option between seasons
  - College offseason choices now include `Enter Transfer Portal` for underclassmen
  - Transferring assigns a new school, resets the college team state for the next season, and usually puts the player back at backup
  - Strong transfer players still have a small chance to arrive as an immediate starter, but most must re-earn the job at the new program

- Added weekly game grades with depth-chart consequences
  - Game results now show a letter grade from `A` to `F`
  - Starters can lose their spot after repeated poor weekly grades, especially `D` and `F` performances
  - Backups can earn a promotion to starter after strong `A` or `B` game grades, with better technique, IQ, and confidence improving the odds
  - High school, college, and NFL weekly game loops now apply these lineup changes immediately after the game

- Improved activity rewards visibility so attribute gains are explicit
  - Activity application now returns the exact stat and money changes it applied
  - The weekly story log now shows a dedicated stat-change line after each activity, such as `+2 TEC, -1 HP`
  - This makes it clear that activities are actually upgrading the player rather than only showing flavor text

- Fixed game-day simulation treating backups like full-time starters
  - Shared `simulateGame()` now reduces snap impact and stat volume for backup players
  - Bench players can now have no meaningful personal stat line and get sideline-specific story text
  - Backup game stories now explicitly describe limited snaps instead of implying a full starter workload

- Fixed Activities tab action buttons getting stuck after pressing "Do This"
  - Preserved the active week's game-day continuation callback inside the shared game loop
  - Activities selected after a tab refresh now correctly proceed back into event check and game day
  - This fixes the stalled weekly flow where an activity could be clicked but the game stopped advancing

- Fixed childhood youth-football signup loop when choosing "Not yet..."
  - Declining organized youth football now sets a persistent branch instead of immediately re-triggering the same signup prompt at the next age
  - Added preteen non-youth-football events for ages 10-13 so the story continues naturally before high school
  - "Not yet..." now behaves like a meaningful decision rather than a broken repeat prompt

- BUG FIX 1: Player changing high school every season
  - Added `persistentHSTeam` module variable to store the same Team across all 4 high school years
  - Modified `startHighSchoolSeason()` to reuse team on subsequent years: reset wins/losses, regenerate schedule with new opponents, slightly improve team strength (+1-4 each year)
  - Reset `persistentHSTeam` when starting new game and when entering college phase
  - Players now attend same school for all 4 high school seasons, matching standard football career structure

- BUG FIX 2: Auto-scroll not working in story panel
  - Updated `addStoryHeadline()`, `addStoryText()`, and `clearStory()` to scroll the `story-panel` parent container (not `story-log`)
  - Used `requestAnimationFrame()` to ensure DOM updates complete before scrolling
  - Added auto-scroll to `showChoices()` to scroll after rendering choice buttons
  - Story log now properly scrolls to show newest content after text/divider additions

- BUG FIX 3: State championships too easy + playoff inconsistency
  - Significantly increased playoff opponent strength: Regional (65-80), State Semifinal (78-92), State Final (88-98)
  - This makes state championships rare (~8% for average team), matching The Show '25 spec
  - Added `wonStateThisSeason` flag to prevent multiple championship messages per season
  - Championship wins now tracked in `bigDecisions` array for career records
  - Reset championship flag when entering new high school season

- BUG FIX 4: Childhood events repeat
  - Added `usedChildhoodEvents` Set to track already-selected event indices per age bracket
  - Modified `getChildhoodEvent()` to filter out used events before random selection
  - When all events in age bracket are used, set clears and reuses are allowed
  - Organized events into proper age groups: 0-1 (baby), 2-3 (toddler), 4-6 (young child), 7-9 (older child)
  - Added 7 new childhood events for variety: "said first word", "tried to tackle dog", first day of school, flag football touchdown, watching football, asking for birthday football, playing catch with dad

- Imported `ScheduleEntry` and `generateOpponentName` from `team.ts` to support persistent team schedule regeneration

### Developer Tests and Notes

- TypeScript compilation succeeds with `--strict` flag: all type checking passes
- No breaking changes to player or team interfaces
- Backward compatible with existing saves (new module variables initialize correctly)

## 2026-04-04

### Additions and New Features

- Academic events system (`src/data/events.json`):
  - Added 12 new "academic" tagged events for high school phase covering school life and balance with football
  - big_test_tomorrow: study vs. skip practice choice with IQ/discipline tradeoff
  - teacher_offers_tutoring: accept help or prioritize football time
  - report_card_day: show results proudly or hide from parents
  - academic_honors: accept award or stay humble (requires discipline >= 60)
  - homework_piling_up: all-nighter, ask teammate, or skip homework
  - group_project_slacker: do it all, confront partner, or tell teacher
  - eligibility_warning: buckle down, cheat (sets flag), or ask for extra credit (requires discipline <= 40)
  - skipping_class: skip, go to class, or skip with guilt
  - prom_vs_practice: attend prom, skip for practice, or try both (requires week >= 8)
  - school_newspaper_feature: do interview or stay focused
  - detention: serve quietly, argue out, or coach gets you out
  - drivers_license_test: take test (sets flag), practice more, or not interested (weight 8, is_big_decision: true)
- Conference standings system (`src/team.ts`):
  - ConferenceTeam interface: name, strength, wins, losses, ties
  - Conference interface: name, teams array
  - generateConference(playerTeamName, playerTeamStrength): create 8-team conference with player team + 7 random opponents (strength 30-85), assign random region name
  - simulateConferenceWeek(conference, playerTeamName, playerWon): update player record, simulate other teams with strength-based win probability
  - getStandings(conference): sort teams by wins desc, then losses asc
  - formatStandings(conference, playerTeamName): formatted string with ">>>" marking player team, includes conference name and records
  - All functions exported for UI integration

### Behavior or Interface Changes

- Game simulation math fixes (`src/week_sim.ts`):
  - updateMomentum(): new function to track momentum (-10 to +10 range) that builds with great performance and decays toward 0 each week. Momentum amplifies or dampens performance scores to create hot/cold streaks
  - Logistic curve for win probability: teamDifferential drives win% using `1 / (1 + exp(-0.08 * diff))`, giving ~50% at even, ~65% at +10 differential, ~80% at +20. This makes state championships harder and matches The Show '25 spec
  - Playoff intensity parameter: opponents get +10-15 strength boost in playoff games, making them appropriately tougher
  - Controlled variance system: base variance (-12 to +12) is modified by confidence stat (high confidence >70 reduces negative variance, low confidence <30 amplifies it). This makes confident players more consistent and shaky players less predictable
  - Overtime simulation: when scores tie after regulation, run weighted coin flip based on team strength differential to break the tie. Ties now become very rare (ties only occur if OT coin flip resolves to exact OT match, which is near zero probability)

### Behavior or Interface Changes

- GameResult interface: replaced boolean `teamWon` with string `result: 'win' | 'loss' | 'tie'` to handle ties properly and provide explicit game outcomes
- Game story text generation: updated to show overtime context in narrative (e.g. "After a dramatic overtime, you led the team to a 28-27 victory!")
- simulateGame() now accepts optional `playoffIntensity` boolean to make playoff games harder with opponent boost

### Additions and New Features (continued)

- College phase (`src/college.ts`): 4-year college football experience
  - Interfaces: CollegeChoice, CollegeSeasonResult, NILDeal
  - startCollege(): initialize college with team assignment from recruiting
  - getCollegeSeasonChoices(): 3-4 context-aware choices per year (freshman through senior)
    - Year 1: focus on academics, earn playing time, or build relationships
    - Year 2: become a leader, dominate position, or pursue NIL deals
    - Year 3: declare for draft, return for senior year, or enter transfer portal (BIG DECISIONS)
    - Year 4: chase individual accolades, focus on team success, or balance both
  - simulateCollegeSeason(): season performance with wins/losses, story text, awards, draft stock gain
  - calculateDraftStock(): 0-100 rating based on weighted core stats (athleticism 0.35, technique 0.30, footballIq 0.20, confidence 0.10, size 8)
  - generateNILDeal(): sponsorship opportunities that boost money and popularity (Nike, Gatorade, Beats, etc)
  - applyCollegeChoice(): apply stat effects from choices with proper clamping
  - checkDeclarationEligibility(): enforce year 3+ rule for draft declaration
  - College teams from data: Power 5 (Alabama, Ohio State, Georgia, etc), Group of 5 (Boise State, Memphis, etc), D2, D3
- NFL phase (`src/nfl.ts`): multi-season NFL career with narrative focus
  - Interfaces: NFLSeasonResult, DraftResult, NFLMidseasonEvent, RetirementDecision, HallOfFameEligibility
  - getNFLDraftResult(): draft day experience with round/pick assignment based on draft stock
    - Elite stock (85+): first round selections with dramatic narrative
    - High stock (70+): early second round possibility
    - Mid stock (50+): mid-round picks
    - Low stock (30+): late rounds with pressure narrative
    - Undrafted (<30): free agent signings with motivation angle
  - simulateNFLSeason(): full season simulation with stat decline by age
    - Position-specific stats: QBs (passing yards, TDs, INTs), RBs (rushing yards, receptions, TDs), WRs/TEs (receptions, yards, TDs), LBs/Ss (tackles, sacks, INTs), DL (tackles, sacks)
    - Aging factor: athleticism and health decline after age 30, faster after 35
    - Pro Bowl and All-Pro awards for top performance
    - Salary based on depth chart status and experience
  - getNFLMidseasonEvent(): 5 event types with meaningful choices
    - Contract negotiations: extend deal, holdout for more, or test free agency
    - Playoff push: play through injury, manage workload, or chase bonuses
    - Trade rumors: request trade to contender, demand trade, or prove yourself
    - Mentorship: mentor rookie, focus on self, or balance both
    - Media criticism: embrace it, ignore it, or clap back (with consequences)
  - checkRetirement(): forced retirement at 40/severe health decline, voluntary at 35+ with adequate savings
  - generateLegacySummary(): career summary narrative based on seasons, teams, wins, money
  - checkHallOfFame(): strict HOF eligibility (4+ Pro Bowls, 1+ Super Bowl + 4+ All-Pro, or 12+ years with 120+ wins at 60% win rate)
  - applyNFLEventChoice(): apply stat/money/popularity effects from choices
  - NFL teams from data: all 32 teams
- Core gameplay improvements: college and NFL phases now complete the career arc from high school through retirement

### Behavior or Interface Changes

- Event system (`src/events.ts`): complete data-driven event engine with weighted selection
  - Interfaces for GameEvent, EventChoice, and EventConditions
  - loadEvents(): async fetch and parse events.json
  - filterEvents(): filter events by phase, week, position, stats, and flags
  - selectEvent(): weighted random selection (higher weight = more likely)
  - applyEventChoice(): apply stat effects, set/clear flags, return story text
- Event data (`src/data/events.json`): 17 high school events prioritized by co-designer feedback
  - 5 rival drama events: trash talk, showdowns, off-field incidents, injuries, same-team promotion
  - 4 injury events: ankle sprain, concussion scare, season-ending ACL tear, chronic issues
  - 4 recruiting events: scout visits, offer letters, campus visits, fading interest
  - 2 big decision events: position switch offer, transfer school offer
  - 2 coach events: benching threats, praise moments
  - Story-first design with vivid flavor text and meaningful trade-offs
  - Variety in stat effects: athleticism, technique, footballIq, discipline, health, confidence, popularity, leadership, durability
- Created game design spec at `docs/superpowers/specs/2026-04-04-football-career-sim-design.md`
- Project scaffolding: `tsconfig.json`, `package.json`, `index.html`, `styles.css`
- Player system (`src/player.ts`): core stats, hidden stats, birth generation, position buckets
- Save system (`src/save.ts`): localStorage autosave and load
- Position data (`src/data/positions.json`): 5 position buckets with stat weights
- Character creation screen with name input and random name option
- Childhood phase (ages 0-9): year-by-year events with choices that shape stats
- Youth football phase (ages 10-13): season summaries with training events
- Position discovery in early high school: coach suggests position based on stats
- Full career phase flow: childhood -> youth -> high school (with placeholder)
- Dark-themed mobile-first UI with stat bars, story panel, and big choice buttons
- Name pools for random character generation
- UI rendering module (`src/ui.ts`): centralized functions for all game UI updates
  - Stat bar management: color-coded (green >= 70, yellow >= 40, red < 40)
  - Header updates: player info, position, team, age, career phase
  - Story log: headlines, text, results with auto-scroll
  - Choice buttons: dynamic rendering with optional primary styling
  - Event modal: overlays for special events with choices
  - Status bar: team record and recruiting status
  - Weekly focus system: 5 training focus options
  - Game result display: player line and team outcome
- Recruiting system (`src/recruiting.ts`): college recruiting for juniors and seniors
  - Interfaces for CollegeOffer and RecruitingState
  - updateRecruitingStars(): calculate star rating using weighted formula
    (athleticism 0.25 + technique 0.25 + footballIq 0.2 + confidence 0.15 + discipline 0.15)
    - 5 stars: >= 75, 4 stars: >= 60, 3 stars: >= 45, 2 stars: >= 30, else 1 star
  - generateOffers(): create 0-8 college offers based on star rating and season wins
    - Power 5 schools (Alabama, Ohio State, Clemson, Oregon, USC, Michigan, LSU, Georgia,
      Texas, Penn State, Oklahoma, Texas A&M, Nebraska, Florida, Notre Dame)
    - Group of 5 schools (Boise State, Memphis, UCF, Appalachian State, Coastal Carolina,
      Liberty, San Diego State, Nevada, Air Force, Colorado State, Tulane, Temple)
    - D2 and D3 schools with randomization
    - Scholarship weights: 5-star gets full scholarships, lower stars get partial/walk-on
    - Interest level based on star rating and season performance
  - getRecruitingStory(): narrative text about recruiting status with top offer mention
  - commitToCollege(): dramatic story text when player commits to an offer
    - Story tone varies by prestige level and scholarship type

- Team system (`src/team.ts`): team generation with coach personalities, schedules
- Weekly simulation (`src/week_sim.ts`): focus choices, game sim, stat lines per position
- Preseason tryouts with depth chart battles before regular season
- Playoff system: teams with 6+ wins qualify, single elimination to state championship
- Awards system: Player of the Week (elite games), All-Conference (avg >= 60), All-State (>= 75)
- BitLife-style persistent timeline: story log never clears, all ages scrollable
- Expanded events to 35+ total across rival, injury, recruiting, coach, academic categories
- Name and team data files (`src/data/names.json`, `src/data/teams.json`)
  with real NFL/college names and generated high school names

### Behavior or Interface Changes

- Story log now appends with dividers instead of clearing (BitLife-style timeline)
- Only "Start Fresh" on new game performs a full story clear

### Decisions and Failures

- Chose vanilla TypeScript with no framework for simplest iPad Safari deployment
- Position system uses 5 buckets (passer, runner/receiver, lineman, defender, kicker)
  instead of individual position formulas for first build
- Childhood/youth phases kept intentionally fast (setup, not the main game)
- Freshmen start as backup on depth chart (underdog-first design)
