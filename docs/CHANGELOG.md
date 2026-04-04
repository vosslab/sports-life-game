# Changelog

## 2026-04-04

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

### Fixes and Maintenance

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
