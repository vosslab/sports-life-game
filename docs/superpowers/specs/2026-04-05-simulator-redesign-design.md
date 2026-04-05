# Simulator redesign: one engine, three league profiles

## Context

The current game simulation in `src/week_sim.ts` uses a single formula to generate scores and stats independently. Scores come from `floor(strength/100 * 28) + random(3,17)` and stats are generated from a performance score that doesn't connect to how scoring actually happened. This produces unrealistic results: kicker stats don't match team score, turnovers are cosmetic, and scores can exceed 50+.

The `OTHER_REPOS_FOR_STUDY/nflsim/` repo provides a strong architectural template: a state-machine-driven play-by-play engine where scores emerge from drives and stats accumulate from individual plays. We adapt this architecture with a league-rules layer so the same engine produces IHSA blowouts, ranking-driven FCS, and tight NFL games.

## Architecture

```
src/simulator/
  engine/
    game_engine.ts        # main loop: simulateGame(home, away, rules, tuning)
    state_machine.ts      # GameState, Phase, Situation enums, PlayOutcome
    clock.ts              # clock management, quarter transitions
    rules_engine.ts       # apply_play_result: downs, possession, scoring
  models/
    play_call_model.ts    # pass/run/punt/FG decision by context
    play_result_model.ts  # yard distributions, completions, sacks
    team_strength_model.ts # TeamProfile, GameTeamContext, matchup adjustments
    special_teams_model.ts # kickoffs, punts, FG success curves, PAT
    turnover_model.ts     # INT/fumble rates and consequences
  rules/
    league_rules.ts       # LeagueRules interface (sport rules)
    league_tuning.ts      # LeagueTuning interface (simulation knobs)
    ihsa_rules.ts         # HS rules + frosh_soph and varsity tuning presets
    fcs_rules.ts          # FCS rules + tuning
    nfl_rules.ts          # NFL rules + tuning
  tuning/
    ihsa_playcalling.ts   # HS play-call tendencies
    fcs_playcalling.ts    # FCS play-call tendencies
    nfl_playcalling.ts    # NFL play-call tendencies
    ihsa_scoring.ts       # HS yard distributions, FG curves
    fcs_scoring.ts        # FCS yard distributions, FG curves
    nfl_scoring.ts        # NFL yard distributions, FG curves
  season/
    season_simulator.ts   # week-by-week season orchestration
    standings.ts          # W-L-T, division/conference records, tiebreakers
    rankings.ts           # weekly polls (FCS), power rankings
    playoffs.ts           # bracket generation and advancement
  output/
    box_score.ts          # team-level stats from accumulated plays
    stat_line.ts          # player stat line extraction from play log
    story_summary.ts      # narrative tags and story-safe abstractions
```

## Key design decisions

### 1. One engine, parameterized by league

```typescript
function simulateGame(
  home: GameTeamContext,
  away: GameTeamContext,
  rules: LeagueRules,
  tuning: LeagueTuning,
): SimulatorGameResult
```

The engine never checks `if (league === "nfl")`. All league differences flow through the rules and tuning interfaces.

### 2. Split rules from tuning (reviewer feedback)

**LeagueRules** - actual rules of the sport (stable):

```typescript
interface LeagueRules {
  id: "ihsa" | "fcs" | "nfl";
  tier?: "frosh_soph" | "varsity";
  quarterLengthMin: number;
  overtimeType: "hs" | "college" | "nfl";
  fieldGoalMaxRange: number;
  patSuccessRate: number;
  twoPointRate: number;
}
```

**LeagueTuning** - simulation environment knobs (iterable):

```typescript
interface LeagueTuning {
  homeFieldEdge: number;
  parity: number;
  ratingGapImpact: number;
  rankingImpact: number;
  averageTotalPoints: number;
  totalPointsVariance: number;
  blowoutFactor: number;
  closeGameCompression: number;
  upsetFactor: number;
  passRateBase: number;
  fourthDownAggression: number;
  fieldGoalAccuracy: number;
  completionRate: number;
  turnoverRate: number;
  sackRate: number;
  explosivePlayRate: number;
  penaltyRate: number;
}
```

This separation means rules stay stable while tuning evolves constantly during calibration.

### 3. TeamProfile vs GameTeamContext (reviewer feedback)

**TeamProfile** - base team identity (persists across season):

```typescript
interface TeamProfile {
  name: string;
  overall: number;
  offense: number;
  defense: number;
  runOffense: number;
  passOffense: number;
  runDefense: number;
  passDefense: number;
  specialTeams: number;
  discipline: number;
  explosiveness: number;
  consistency: number;
  depth: number;
  ranking?: number;
}
```

**GameTeamContext** - game-day derived input (computed fresh each game):

```typescript
interface GameTeamContext {
  profile: TeamProfile;       // already includes player stat boosts
  momentum: number;           // from recent W-L streak
  fatigue: number;            // from bye weeks, season wear
  injuryAdjustment: number;   // health-related modifier
  weatherAdjustment: number;  // outdoor game conditions
}
```

The engine receives `GameTeamContext`, never mutates the base `TeamProfile`.

### 4. How leagues feel different

**IHSA Frosh/Soph**
- Lowest parity, highest rating gap impact (one athlete dominates)
- Highest blowout factor, highest variance
- Barely functional kicking (FG max ~30 yards, ~45% accuracy)
- Very run-heavy (~70%), lots of incompletions and broken plays
- High turnover and penalty rates
- Scores like 48-6, 55-14, 60-0

**IHSA Varsity**
- Low parity, high rating gap impact (less extreme than FS)
- High blowout factor, high variance
- Weak kicking (FG max ~38 yards, ~55% accuracy)
- Run-heavy (~60%), more passing than FS
- Moderate turnover/penalty rates
- Scores like 42-7, 35-14, 28-21

Both share one `ihsa_rules.ts` file exporting two presets. Same engine, same interface, different constants.

**FCS (college)**
- Medium parity, strong ranking impact
- Moderate blowout, moderate variance
- Stronger home field than NFL
- Functional kicking (FG max ~45 yards, ~75% accuracy)
- Scores like 31-17, 24-10, 38-21

**NFL**
- High parity, low rating gap impact
- Low blowout factor, strong close-game compression
- Best kicking (FG max ~58 yards, ~85% accuracy at 40y)
- Many one-score games
- Scores like 24-21, 17-13, 27-24

### 5. Player impact on simulation

The player's stats and position modify the `GameTeamContext.playerStarAdjustment` and directly affect specific TeamProfile dimensions for their team.

**How player stats feed into the sim:**

```typescript
function buildGameTeamContext(
  team: Team,
  player: Player | null,
  context: WeekContext,
): GameTeamContext {
  const profile = { ...team.baseProfile };

  if (player && player.depthChart === 'starter') {
    // Position-specific boosts from player stats
    switch (player.positionBucket) {
      case 'passer':
        // QB boosts pass offense, completion rate, reduces INT tendency
        profile.passOffense += (player.core.technique - 50) * 0.02;
        profile.passOffense += (player.core.footballIq - 50) * 0.02;
        profile.consistency += (player.core.confidence - 50) * 0.01;
        break;
      case 'runner':
        // RB boosts run offense and red-zone efficiency
        profile.runOffense += (player.core.athleticism - 50) * 0.02;
        profile.runOffense += (player.core.technique - 50) * 0.01;
        profile.explosiveness += (player.core.athleticism - 50) * 0.015;
        break;
      case 'receiver':
        // WR/TE boosts pass offense and explosive play rate
        profile.passOffense += (player.core.athleticism - 50) * 0.01;
        profile.explosiveness += (player.core.athleticism - 50) * 0.02;
        break;
      case 'lineman':
        // OL/DL boosts run offense or run defense, reduces sack rate
        profile.runOffense += (player.core.technique - 50) * 0.015;
        profile.discipline += (player.core.discipline - 50) * 0.01;
        break;
      case 'defender':
        // LB/DB boosts defense, generates turnovers
        profile.runDefense += (player.core.athleticism - 50) * 0.015;
        profile.passDefense += (player.core.footballIq - 50) * 0.015;
        break;
      case 'kicker':
        // Kicker boosts special teams
        profile.specialTeams += (player.core.technique - 50) * 0.03;
        break;
    }
  }

  // Depth chart scales all profile boosts
  const depthScale = player?.depthChart === 'starter' ? 1.0
    : player?.depthChart === 'backup' ? 0.4
    : 0.1;
  // Apply scale to all profile deltas (shown above at full strength)

  return {
    profile,
    momentum: computeMomentum(team.recentResults),
    fatigue: computeFatigue(team, context.weekNumber),
    injuryAdjustment: -(100 - player?.core.health ?? 100) * 0.005,
    weatherAdjustment: 0,
  };
}
```

**During simulation, the player's team profile directly shapes:**
- Pass/run play calling tendencies (high passOffense = more passing)
- Completion rate and sack rate (modified by matchup multipliers)
- Explosive play frequency (from explosiveness)
- Turnover rate (from discipline)
- FG reliability (from specialTeams)

**After simulation, player stat extraction:**
- The engine tracks which plays involved "star player" moments
- For the player's position, extract relevant stats from the play log:
  - QB: passing plays -> completions, yards, TDs, INTs
  - RB: rushing plays -> carries, yards, TDs
  - WR/TE: receiving plays -> targets, catches, yards, TDs
  - Defenders: defensive stops -> tackles, sacks, INTs
  - Kicker: FG/XP attempts -> makes, distances
- Stats emerge from actual simulated plays, not generated independently

**Position-specific snap shares** (not one universal rule):

| Position | Starter | Backup | Bench |
| --- | --- | --- | --- |
| QB | ~95% (all or nothing) | ~5% (garbage time only) | 0% |
| RB | ~55% (committee common) | ~30% | ~15% |
| WR/TE | ~70% (rotation) | ~20% | ~10% |
| OL/DL | ~75% | ~20% | ~5% |
| LB/DB | ~70% (rotation common) | ~20% | ~10% |
| Kicker | ~100% (deterministic) | 0% | 0% |

### 6. Clutch moment integration

The clutch moment system hooks into the engine via a clean breakpoint interface, not by mutating engine internals.

**ClutchCheckpoint** - exposed by the engine at natural breakpoints:

```typescript
interface ClutchCheckpoint {
  quarter: number;
  timeRemaining: number;
  down: number;
  distance: number;
  yardLine: number;
  offenseTeamId: string;
  defenseTeamId: string;
  scoreDiff: number;
  situation: Situation;
  isPlayoff: boolean;
}
```

**How it works:**

1. The game engine runs normally through Q1-Q3 and early Q4.
2. At each play in Q4 (or late Q3 in close games), the engine checks:
   - Is this a close game? (margin <= 10)
   - Is the player a starter?
   - Is this a key situation? (LATE_AND_CLOSE, TWO_MINUTE, RED_ZONE)
3. If eligible, the engine **pauses** and exposes a `ClutchCheckpoint`.
4. `week_sim.ts` (the adapter) passes this to `clutch_moment.ts`.
5. The clutch system presents choices and resolves the outcome.
6. The clutch result maps to a concrete play outcome:

```typescript
function clutchResultToPlayOutcome(
  clutchResult: ClutchOutcome,
  checkpoint: ClutchCheckpoint,
): PlayOutcome {
  // Big success on comeback_drive -> complete pass for TD
  // Partial success on hold_lead -> run for first down, drain clock
  // Failure on must_have_stop -> opponent gains first down
  // Disaster on final_play -> turnover
}
```

7. The engine resumes with this `PlayOutcome` injected into the state machine.
8. The game finishes normally from there.

**This means:**
- Clutch moments produce real play outcomes, not post-hoc score adjustments
- The clutch system never mutates `GameState` directly
- The engine doesn't know about clutch logic - it just receives a `PlayOutcome`
- Score changes from clutch plays are coherent with the game state

### 7. nflsim baseline rates (reference)

| Parameter | NFL | IHSA FS | IHSA V | FCS |
| --- | --- | --- | --- | --- |
| Sack rate (per dropback) | 6.5% | 4% | 5% | 6% |
| Completion rate | 65% | 40% | 50% | 58% |
| INT rate (per attempt) | 2.5% | 5% | 4% | 3% |
| Rush fumble rate | 1.5% | 4% | 3% | 2% |
| Catch fumble rate | 1% | 3% | 2% | 1.5% |
| Kickoff touchback | 55% | 20% | 30% | 40% |
| Punt fair catch | 40% | 15% | 25% | 35% |
| Penalty rate (per play) | 14% | 18% | 15% | 14% |
| XP success | 94% | 70% | 80% | 88% |
| 2pt conversion | 48% | 35% | 40% | 45% |
| FG success at 30y | 93% | 50% | 65% | 80% |
| FG success at 40y | 87% | N/A | 40% | 65% |
| FG success at 50y | 72% | N/A | N/A | 40% |
| Pick-six rate | 15% | 20% | 18% | 15% |
| Base pass rate | 58% | 30% | 40% | 50% |

### 8. nflsim state machine (to port)

**Phase states:** COIN_TOSS -> KICKOFF -> NORMAL -> PAT -> OVERTIME -> GAME_OVER

**Situation classification:**
- TWO_MINUTE: <=120s in Q2/Q4
- GOAL_LINE: inside opponent's 3
- RED_ZONE: inside opponent's 20
- BACKED_UP: inside own 10
- GARBAGE_TIME: 3+ score lead in Q4
- LATE_AND_CLOSE: within 8 points in Q4

**Context key for play calling** (4-tuple):
- down (1-4)
- distance_bucket: "1", "2-3", "4-6", "7-10", "11-15", "16+"
- field_zone: "goal_line", "green_zone", "red_zone", "plus_territory", "midfield", "own_territory", "own_deep", "backed_up"
- score_bucket: "down_17+", "down_9_16", "down_4_8", "down_1_3", "tied", "up_1_3", "up_4_8", "up_9_16", "up_17+"

### 9. What we borrow vs don't borrow from nflsim

**Borrow:**
- State machine (Phase, GameState, PlayOutcome)
- Play resolution pattern (resolve_pass/run/punt/FG)
- Rules engine (apply_play_result state transitions)
- Matchup multiplier pattern (MatchupAdjustment)
- Context key binning (down/distance/field/score)
- Box score accumulation from plays

**Don't borrow:**
- NFL-calibrated yard distributions (hand-tune per league)
- Real PBP data pipeline (use TeamProfile traits)
- Polars/numpy dependencies (pure TypeScript)
- Web viewer (not needed)
- Monte Carlo season simulation (not needed yet)

### 10. League-wide season tracking and rankings

Every team in the league is simulated each week, producing live standings and rankings.

**Standings** (`season/standings.ts`):
- W-L-T, division/conference records, points for/against
- Tiebreaker logic per league
- Weekly updates after all games simulated

**Rankings** (`season/rankings.ts`) - editorial overlay on standings, not tightly coupled:
- **IHSA**: Regional power rankings from W-L + SOS. Seed playoff brackets.
- **FCS**: AP-style top 25 poll. Weekly shifts from upsets. Ranking inertia. Affects seeding.
- **NFL**: Power rankings (cosmetic) plus standings-based playoff seeding.

**What the player sees:**
- Weekly standings for their division/conference
- Top 25 poll (FCS) or power rankings
- Upset alerts, rivalry results, playoff picture
- Other teams' notable scores each week

**League-wide simulation:**
- Every team has a TeamProfile generated at season start
- Non-player games use same engine with same league rules
- Mid-season adjustments (momentum, injuries)
- Narrative generation from results (streaks, Cinderella runs, collapses)

## Integration strategy (reviewer feedback)

### Adapter pattern - don't break existing game

`week_sim.ts` becomes an adapter, not a place to jam new logic:

```typescript
// week_sim.ts - becomes the adapter seam
export function simulateWeeklyGame(
  player: Player,
  team: Team,
  opponent: Team,
  context: WeekContext,
): WeeklyGameResult {
  const rules = getLeagueRulesForPhase(player.phase);
  const tuning = getLeagueTuningForPhase(player.phase);
  const home = buildGameTeamContext(team, player, context);
  const away = buildGameTeamContext(opponent, null, context);

  const simResult = simulateGame(home, away, rules, tuning);

  return convertSimulatorResultToWeeklyResult(simResult, player);
}
```

### Three hard contracts

The system has three explicit interface boundaries. Nothing crosses them informally.

**1. Sim input contract:**

```typescript
interface GameTeamContext {
  profile: TeamProfile;
  momentum: number;
  fatigue: number;
  injuryAdjustment: number;
  weatherAdjustment: number;
}
```

**2. Sim output contract:**

```typescript
interface SimulatorGameResult {
  finalScore: { home: number; away: number };
  playLog: PlayLogEntry[];
  teamStats: TeamBoxScore;
  playerStatLine: PositionStatLine;
  clutchCheckpoint?: ClutchCheckpoint;
}
```

**3. Story contract** (`output/story_summary.ts`):

```typescript
interface StoryGameSummary {
  result: "win" | "loss";
  score: { team: number; opponent: number };
  gameTone:
    | "blowout_win"
    | "blowout_loss"
    | "close_win"
    | "close_loss"
    | "comeback_win"
    | "collapse_loss"
    | "defensive_struggle"
    | "shootout";
  significance:
    | "normal"
    | "upset"
    | "rivalry"
    | "playoff_implication"
    | "ranking_implication";
  playerStoryStats: {
    headlineStat?: string;
    touchdowns?: number;
    turnovers?: number;
    sacks?: number;
    interceptions?: number;
    longPlay?: boolean;
    clutchImpact?: boolean;
  };
  notableMoments: string[];
}
```

**Flow:**

```
GameTeamContext
  -> simulateGame()
  -> SimulatorGameResult
  -> story_summary.ts
  -> StoryGameSummary
  -> week_sim.ts adapter
  -> WeeklyGameResult
```

The story layer reads `StoryGameSummary`, never raw play logs. Events, milestones, and text generation consume narrative tags ("threw 3 INTs in a rivalry game", "engineered late comeback"), not simulator internals.

`week_sim.ts` stays thin: build context, call engine, extract story, convert result. No narrative logic lives there.

## Phase plan (reordered per reviewer feedback)

### Phase 1: Single-game engine (minimum playable)
- `state_machine.ts`: GameState, Phase, Situation, PlayOutcome types
- `rules_engine.ts`: apply_play_result (port from nflsim `engine/rules.py`)
- `game_engine.ts`: main loop with state machine
- `play_call_model.ts`: heuristic pass/run/punt/FG decisions (no data tables yet)
- `play_result_model.ts`: yard sampling, completion, sack
- `special_teams_model.ts`: kickoff, punt, FG, PAT
- `turnover_model.ts`: INT/fumble with real consequences
- `team_strength_model.ts`: TeamProfile + matchup multipliers
- `league_rules.ts` + `league_tuning.ts`: interfaces
- `nfl_rules.ts`: NFL rules and tuning as first target
- Skip full clock nuance and penalties in Phase 1

Deliverable: engine produces realistic NFL scores from TeamProfile inputs.

### Phase 2: Adapter and integration with weekly flow
- `week_sim.ts` becomes adapter: build context, call engine, convert result
- Result conversion layer (SimulatorGameResult -> WeeklyGameResult)
- `box_score.ts` + `stat_line.ts`: extract player stats from play log
- Verify weekly_engine.ts, UI, milestones work with new result shape
- Delete old formula-based `simulateGame()` once parity proven

Deliverable: player games use new engine, rest of game unchanged.

### Phase 3: League rules and calibration
- `ihsa_rules.ts`: frosh_soph and varsity presets
- `fcs_rules.ts`: FCS rules and tuning
- Tuning files per league (play-calling, scoring distributions)
- `clock.ts`: full clock management, quarter transitions
- Calibration: 100+ games per league, check score distributions
- Add penalties

Deliverable: all three leagues produce characteristic score distributions.

### Phase 4: Non-player games and standings
- Non-player games through same engine
- `standings.ts`: full league standings with tiebreakers
- `playoffs.ts`: bracket from standings (replace current playoff_bracket.ts)
- Generate TeamProfiles for all league teams at season start

Deliverable: full league simulated, standings tracked.

### Phase 5: Rankings, narratives, and clutch integration
- `rankings.ts`: weekly polls and power rankings
- Clutch moment hookup via ClutchCheckpoint interface
- Weekly narrative generation (upsets, streaks, playoff picture)
- UI: standings tab, rankings view, weekly league recap
- Season storyline generation

Deliverable: complete season experience with live league context.

## Verification

- Simulate 100+ games per league, check score distributions:
  - IHSA FS: average ~45 total points, 40%+ blowouts (20+ margin)
  - IHSA V: average ~42 total points, 30%+ blowouts
  - FCS: average ~48 total points, moderate blowouts, ranking correlation
  - NFL: average ~44 total points, 30%+ one-score games, few 30+ margins
- Player stat lines coherent with team score (XPs match TDs, turnovers affect score)
- Clutch moments trigger correctly in close Q4 games
- Standings and rankings update correctly each week
- Each phase can be tested independently before integration

## Critical files

| File | Change |
| --- | --- |
| `src/week_sim.ts` | Becomes adapter: calls new engine, converts result |
| `src/weekly/weekly_engine.ts` | Minimal changes: consumes adapted WeeklyGameResult |
| `src/player.ts` | Add TeamProfile builder from player stats |
| `src/season/season_simulator.ts` | Use new engine for non-player games |
| `src/season/playoff_bracket.ts` | Use new engine + standings for playoffs |
| `src/clutch_moment.ts` | Hook via ClutchCheckpoint, return PlayOutcome |
| `src/simulator/**` | All new files |
