# Clutch moment system design

## Context

Games in the sports-life-game are currently fully auto-simulated. The player picks a
weekly focus, sometimes gets a random event, then sees the final score. There is no
in-game tactical decision-making. This makes playoff games feel the same as regular
season games despite higher stakes.

This design adds a "clutch moment" system: a single dramatic decision point in the
4th quarter of important games where the player makes a position-specific play call.
The outcome is stat-weighted, so building stats throughout the career pays off in
these high-pressure moments.

## Scope

- Playoffs + key regular season games (rivalry, must-win)
- 1-2 clutch moments per qualifying game
- Position-specific choices (all 5 position buckets)
- Stat-weighted probability outcomes

## Trigger conditions

A clutch moment fires when ALL of these are true:

1. Game is a **playoff game** OR has a `key_game` flag (rivalry week, win-and-in)
2. Score margin entering 4th quarter is **10 points or fewer**
3. Player is a **starter** on the depth chart

If the game is a blowout, no clutch moment triggers. Expected trigger rate: ~60-70%
of qualifying games.

## Game flow change

### Current flow

`simulateGame()` generates the complete final score in one function call.

### New flow

1. `simulateGame()` generates score through 3 quarters (~75% of final points)
2. Check trigger conditions against the 3Q score margin
3. If NOT triggered: complete the 4th quarter normally (auto-sim as today)
4. If triggered: return a partial result with the 3Q score
5. Present the clutch moment popup via `waitForInteraction()`
6. Player selects one of 3 position-specific choices
7. Resolve the choice into a score adjustment using stat-weighted probability
8. Calculate final 4th quarter scoring, incorporating the clutch result
9. Return completed game result

### Key constraint

The weekly engine contract stays intact: every `runSeasonWeek()` call still ends in
exactly one `next_week` or `season_ended` result. The clutch moment is an `await`
inside the game simulation flow.

## Position-specific choices

Each position bucket gets 3 choices at low/medium/high risk tiers.

### QB (passer)

| Choice | Risk | Key Stat | Success | Failure |
| --- | --- | --- | --- | --- |
| Check down / safe pass | Low | technique | +3 pts (FG drive) | 0 pts (stall) |
| Play action / short pass | Medium | footballIq | +7 pts (TD drive) | 0 pts (stall) |
| Go deep / bomb | High | confidence | +7 pts (TD) | -3 pts (INT, opp FG) |

### RB (runner_receiver, position RB)

| Choice | Risk | Key Stat | Success | Failure |
| --- | --- | --- | --- | --- |
| Hit the hole / power run | Low | technique | +3 pts | 0 pts |
| Bounce outside / speed | Medium | athleticism | +7 pts | 0 pts |
| Fight for extra yards | High | confidence | +7 pts | -3 pts (fumble) |

### WR/TE (runner_receiver, position WR or TE)

| Choice | Risk | Key Stat | Success | Failure |
| --- | --- | --- | --- | --- |
| Run a crisp route | Low | technique | +3 pts | 0 pts |
| Break off the route / improvise | Medium | footballIq | +7 pts | 0 pts |
| Go up for the 50/50 ball | High | athleticism | +7 pts | -3 pts (tipped INT) |

### OL/DL (lineman)

| Choice | Risk | Key Stat | Success | Failure |
| --- | --- | --- | --- | --- |
| Hold your assignment | Low | discipline | +3 pts | 0 pts |
| Double team the star | Medium | technique | +7 pts | 0 pts |
| Shoot the gap / blitz pickup | High | athleticism | +7 pts | -3 pts (blown play) |

### LB/CB/S (defender)

| Choice | Risk | Key Stat | Success | Failure |
| --- | --- | --- | --- | --- |
| Stay in your zone | Low | discipline | +3 pts (stop) | 0 pts |
| Jump the route | Medium | footballIq | +7 pts (turnover TD) | -3 pts (blown coverage) |
| Blitz / go for the big hit | High | athleticism | +7 pts (sack/fumble TD) | -3 pts (missed, TD) |

### K/P (kicker)

| Choice | Risk | Key Stat | Success | Failure |
| --- | --- | --- | --- | --- |
| Chip shot / safe kick | Low | technique | +3 pts | 0 pts |
| Aim for the corner / precision | Medium | confidence | +3 pts + pin deep | -3 pts (missed) |
| Bomb it / long FG attempt | High | technique | +7 pts (50+ yd FG) | -3 pts (short, returned) |

## Success probability formula

```
base_rate = { low: 0.75, medium: 0.50, high: 0.30 }
stat_bonus = (relevant_stat - 50) * 0.01
success_chance = clamp(base_rate + stat_bonus, 0.10, 0.95)
```

Examples at different stat levels:

| Stat | Low risk | Medium risk | High risk |
| --- | --- | --- | --- |
| 30 | 55% | 30% | 10% |
| 50 | 75% | 50% | 30% |
| 70 | 95% | 70% | 50% |
| 80 | 95% | 80% | 60% |
| 90 | 95% | 90% | 70% |

The 0.01 multiplier means stats have major impact. An elite player (80+) can
reasonably attempt high-risk plays. A low-stat player (30) should stick to safe
choices. This rewards the stat-building grind throughout the career.

## Score adjustment

Success and failure produce point adjustments applied to the player's team score:

- **Low risk success:** +3 (field goal equivalent)
- **Medium/high risk success:** +7 (touchdown equivalent)
- **Low/medium risk failure:** +0 (stalled drive)
- **High risk failure:** -3 (turnover leading to opponent field goal)

The opponent also gets normal 4th quarter scoring from the auto-sim. The clutch
result is additive to whatever the 4th quarter sim produces for the player's team.

## Narrative presentation

Uses the existing `waitForInteraction()` popup with `style: 'narrative'`.

### Scene-setting text

The description sets the scene with score, time, and stakes:

> "Score: Eagles 17, Cowboys 14. 2:30 left in the 4th. Your team has the ball on
> the opponent's 35. The crowd is deafening. What's the call?"

Scene details are generated from game state: actual team names, actual score,
randomized time remaining (1:00-4:00), randomized field position (own 20 to
opponent 40).

### Choice button format

Each choice button includes a description line showing risk level:

- "Check down to the flat" -- *Safe. Moves the chains, sets up a field goal.*
- "Play action over the middle" -- *Moderate risk. Could break it open for a TD.*
- "Air it out deep" -- *High risk. Home run ball or a devastating pick.*

### Outcome narrative

After resolution, 2-3 sentences of flavor text describe what happened. Each choice
has a success and failure narrative variant stored in the clutch moment data.

Example (QB deep ball, success):
> "You let it fly to the end zone. Your receiver goes up over the corner and comes
> down with it. Touchdown! The sideline erupts."

Example (QB deep ball, failure):
> "You heave it deep but the safety reads it all the way. Picked off at the 15.
> The defense jogs off the field, shaking their heads."

## Key game identification

Beyond playoffs, these regular season games qualify as "key games":

- **Rivalry week:** Flagged in schedule data or by week number
- **Win-and-in:** Team needs a win to clinch a playoff spot (calculated from standings)
- **Undefeated on the line:** Team has zero losses entering the game

The `key_game` flag is set during schedule/matchup generation, before the game
sim runs.

## Files to modify

- `src/week_sim.ts` -- Split `simulateGame()` into 3Q sim + 4Q completion. Add
  clutch moment resolution logic and probability formula.
- `src/weekly/weekly_engine.ts` -- Add clutch moment popup call between game sim
  phases. Handle the async choice flow.
- `src/season/playoff_bracket.ts` -- Ensure playoff games pass the trigger flag.
- `src/season/season_simulator.ts` -- Add key_game flag logic for rivalry/win-and-in.

### New file

- `src/clutch_moment.ts` -- Clutch moment data: position-specific choices, narrative
  text, scene generation, and resolution logic. Keeps clutch content out of the
  already-large `week_sim.ts`.

## Testing

- Verify clutch moments trigger correctly in playoff games with close scores
- Verify they do NOT trigger in blowouts or when player is not a starter
- Verify position-specific choices match the player's position bucket
- Verify probability formula produces expected rates at stat boundaries
- Verify score adjustments apply correctly to final game score
- Verify the weekly engine contract (next_week/season_ended) is preserved
- Play through a full playoff run in the browser to confirm UX flow
