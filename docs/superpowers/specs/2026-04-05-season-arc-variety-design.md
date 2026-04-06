# Season arc and weekly variety redesign

## Problem

The weekly loop is identical from age 14 to 36+: Goal -> Activity -> Event -> Game -> Repeat. Goals and activities are transparent stat trades with no real strategy. Seasons have no narrative arc - no buildup, no midseason tension, no late-season drama. The result is 320+ weeks of the same structure across HS, College, and NFL.

## Solution

Add three interlocking systems to the shared weekly engine:
1. **Season arc phases** - 5 phases per season with distinct tone and choices
2. **Adaptive weekly choices** - context-sensitive decisions with real stakes
3. **Midseason crisis system** - 0-2 disruptive events per season with multi-week consequences

## Design

### 1. Season arc phases

Each season progresses through 5 phases. The arc phase determines what types of events fire, what weekly choices are available, and the narrative tone.

| Phase | Timing | Weekly feel | Content |
| --- | --- | --- | --- |
| Preseason | Before week 1 | Hope, anxiety, roster competition | Depth chart battle, goal setting, new teammate intro |
| Opening | Weeks 1-3 | Establishing identity | First impression game, early momentum or adversity |
| Midseason | Weeks 4-7 | Grind + potential crisis | Normal weeks plus 0-2 crisis events |
| Stretch run | Last 3-4 weeks | Rising tension, stakes | Rivalry week, must-win, playoff implications |
| Postseason | After regular season | Resolution | Playoff run or offseason reflection, key decisions |

Arc phase is stored on the season state and advances automatically based on week number relative to season length.

### 2. Adaptive weekly choices

Replace transparent stat-trade activities with context-sensitive choices that have real stakes.

**Layered choice model:**
- **Background goal** (kept): persistent strategy - grind, healthy, popular, academic. Set once, re-prompted every 5 games. Applies automatic stat effects each week.
- **Weekly choice** (new): 2-3 options drawn from a pool that adapts to context. Replaces the current activity selection.

**Choice pool adapts based on:**
- Current arc phase (preseason choices differ from stretch run)
- Recent game results (losing streak vs winning streak)
- Depth chart status (starter vs backup vs bench)
- Active crises (injury, benching, conflict)
- Player health level
- Background goal (grind unlocks different choices than popular)

**Choice categories:**

| Category | Examples | When available |
| --- | --- | --- |
| Compete | Challenge for starting spot, demand more reps, accept role | Backup/bench, preseason/opening |
| Train | Push through pain, position-specific drill, extra film | Any phase, scales with health |
| Social | Mentor younger player, confront teammate, bond with coaches | Opening and midseason |
| Risk | Play through injury, try new position, go public with frustration | When health low or on bench |
| Respond | Crisis-specific responses (see crisis system below) | During active crisis |
| Prepare | Film study on rival, extra reps, rest for big game | Stretch run, before key games |
| Reflect | Set new goal, evaluate career path, talk to family | Postseason, offseason |

**Key design rule:** No choice is a pure stat upgrade. Every choice has real downside potential:
- "Push through pain": risk making injury worse (-5 to -15 health if bad roll)
- "Confront teammate": could improve chemistry OR create locker room rift
- "Play through injury": might win the game but cost 2-3 weeks recovery
- "Challenge for starting spot": succeed and move up, fail and lose confidence

**Choice presentation:** Each choice shows:
- What you're doing (1 sentence)
- What's at stake (brief risk/reward hint, not exact numbers)
- No guaranteed outcome visible

### 3. Midseason crisis system

0-2 crisis events per season, occurring during the midseason arc phase (weeks 4-7). Crisis probability per season: 70% chance of 1 crisis, 20% chance of 2, 10% chance of 0.

**Crisis types:**

| Crisis | Duration | Trigger weighting | Player responses |
| --- | --- | --- | --- |
| Injury setback | 2-3 weeks | Higher when health < 50 | Rest and miss games / Play through (risk worse) / Rehab hard (miss 1 game) |
| Depth chart shake-up | 1-2 weeks | Higher when backup/bench | Earn it back in practice / Confront coach / Accept new role |
| Locker room conflict | 1-2 weeks | Higher on losing streak | Take sides / Mediate / Stay out of it |
| Coaching change | Season-long modifier | Random, rare (~10%) | Adapt quickly / Resist change / Embrace new system |
| Personal crisis | 1-2 weeks | Random | Handle privately / Ask team for support / Ignore and play |
| Rival emergence | 2-3 weeks | Higher when starter + winning | Train specifically / Talk trash / Let play speak |

**Crisis mechanics:**
- During a crisis, the weekly choice is replaced by crisis-specific responses
- Each crisis has a resolution event that fires 1-3 weeks later
- Resolution quality depends on how the player responded
- Crisis effects: stat changes, depth chart shifts, confidence swings, reputation changes
- A crisis can cascade: poor handling of a locker room conflict could trigger a depth chart shake-up

**Weighting by context:**
- `injury`: weight = (100 - health) / 50
- `depth_chart`: weight = (depthChart === 'bench' ? 2 : depthChart === 'backup' ? 1 : 0.3)
- `locker_room`: weight = (recentLosses >= 3 ? 2 : 1)
- `coaching_change`: weight = 0.5 (flat, rare)
- `personal`: weight = 1 (flat, always possible)
- `rival`: weight = (depthChart === 'starter' && recentWins >= 3 ? 2 : 0.5)

### 4. Stretch run tension

The last 3-4 weeks of regular season shift the weekly experience:

**Playoff implications:** Each week shows the player's playoff status:
- "Win and you clinch a playoff spot"
- "Must win out to have a chance"
- "Already clinched - resting starters?"
- "Eliminated - playing for pride"

**Rivalry week:** One game per season is designated as a rivalry game (preseason assignment). The week before rivalry week offers special preparation choices:
- Study rival film (footballIq boost + game performance bonus)
- Talk trash to media (confidence boost but risk bulletin board motivation for opponent)
- Quiet focus (discipline boost, steady approach)

**Pressure amplification:** During stretch run with playoff implications:
- Confidence swings from wins/losses are 1.5x normal
- Clutch moments trigger more frequently (25% vs 15%)
- Post-game narrative is more dramatic ("season on the line" framing)

**Eliminated teams:** If mathematically eliminated before season ends:
- Choices shift to development focus (try new position, mentor younger player)
- Pressure drops, recovery choices appear
- Scouting for next year narrative

### 5. Implementation scope

**Files to modify:**
- `src/weekly/weekly_engine.ts` - add arc phase tracking, crisis scheduling, adaptive choice generation
- `src/week_sim.ts` - keep applySeasonGoal, remove old activity stat trades
- `src/activities.ts` - replace static activities with adaptive choice pools

**New files:**
- `src/season_arc.ts` - arc phase logic, phase transitions, phase-specific choice pools
- `src/crisis.ts` - crisis types, weighting, resolution, multi-week tracking
- `src/weekly_choices.ts` - adaptive choice generation, context evaluation, outcome resolution

**Data files:**
- `src/data/choices/preseason.json` - choice pool for preseason phase
- `src/data/choices/opening.json` - choice pool for opening weeks
- `src/data/choices/midseason.json` - choice pool for normal midseason weeks
- `src/data/choices/stretch.json` - choice pool for late season
- `src/data/choices/postseason.json` - choice pool for offseason
- `src/data/crises/` - crisis definitions with responses and resolutions

**Unchanged:**
- `src/simulator/` - game simulation engine (no changes needed)
- `src/clutch_moment.ts` - clutch system (stretch run just triggers it more)
- `src/player.ts` - player stat model (no structural changes)
- Phase handlers (hs_frosh_soph.ts, college_phase.ts, nfl_phase.ts) - minimal changes, mainly season config

### 6. Verification

- Play through a full 10-game HS season: verify arc phases transition, at least 1 crisis fires, stretch run feels different, choices adapt to context
- Play through a full 17-game NFL season: verify 0-2 crises, rivalry week triggers, playoff implications display, eliminated teams get different choices
- Verify no two seasons feel identical: run 5 seasons and check crisis variety
- Verify crisis responses have lasting effects (depth chart change persists, injury recovery takes weeks)
- Verify background goals still work alongside new weekly choices
