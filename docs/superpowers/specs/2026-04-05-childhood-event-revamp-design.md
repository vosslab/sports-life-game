# Childhood event revamp: ages 1-9

## Context

Ages 1-9 currently use a flat pool of 26 generic events (childhood.json) with no
age-based filtering. A 2-year-old and a 7-year-old face the same events. Effects are
small stat nudges (+1 to +3 on core football stats), which makes childhood feel like
a disguised training phase instead of trait formation. Only one event is marked as a
big decision.

This phase 1 revamp replaces the flat event pool with age-banded events that have
distinct personality per year, humorous flavor text, and story flag callbacks. Hidden
traits and archetype drift are deferred to phase 2.

## Design

### Age bands and event files

Split `childhood.json` into three files loaded by `loadEvents()`:

| File | Ages | Phase value | Focus |
| --- | --- | --- | --- |
| `childhood_early.json` | 1-3 | `childhood_early` | Temperament, chaos, motor drive |
| `childhood_middle.json` | 4-6 | `childhood_middle` | Social formation, rules, competition |
| `childhood_late.json` | 7-9 | `childhood_late` | Pre-athletic identity, practice, strategy |

Each file uses a distinct `phase` value so `filterEvents()` can select the right band.
The `kid_years.ts` handler maps the player's age to the correct phase string.

### Age-specific conditions

Add `min_age` and `max_age` fields to `EventConditions` so events can target a single
year or a 2-year range within a band:

```typescript
export interface EventConditions {
  min_age?: number;
  max_age?: number;
  // ... existing fields unchanged
}
```

`filterEvents()` gains an `age` parameter. When `min_age` or `max_age` is present on
an event, the player's age must be in range.

Example: an event with `"min_age": 2, "max_age": 2` fires only at age 2.
An event with no age fields fires for any age in its phase band.

### Events per year

Keep the current pattern but adjust:

| Ages | Events per year | Rationale |
| --- | --- | --- |
| 1-3 | 1 core event | Toddlers, short attention span |
| 4-6 | 2 events (1 core + 1 social/personality) | More going on |
| 7-9 | 2 events (1 core + 1 competition/identity) | Pre-athlete forming |

### Event content per age

Each age gets 3-5 dedicated events. Tone is realistic with dry humor.
Flavor text uses the voice from the user's examples.

**Age 1 -- Chaotic athlete origin story**
- Crawls toward anything spherical, ignores all other toys
- Throws food off high chair, studies the bounce
- "Baby refuses nap. Practices aggressive crawling drills across the living room."
- Effects: mostly athleticism, health, durability (small). No footballIq or technique.

**Age 2 -- Raw chaos + early competitiveness**
- Turns everything into a throwing contest
- Gets upset when losing even in made-up games
- "You challenged the family dog to a race. Loss disputed. Rematch demanded."
- Effects: confidence, discipline, durability.

**Age 3 -- Imagination meets intensity**
- Pretends to be "the fastest player ever"
- Repeats same action 20+ times
- "You declared yourself MVP of backyard league. League consists of you."
- Effects: confidence, athleticism. Flag potential: `selfStarter`.

**Age 4 -- Rules exist but negotiable**
- Learns rules then tests limits
- Takes games too seriously for the setting
- "You flipped the board after losing Candy Land. Investigation ongoing."
- Effects: discipline, confidence. Flag potential: `poorLoser` or `competitiveSpirit`.

**Age 5 -- Organized chaos with rules**
- Follows rules when winning, questions them when losing
- Compares performance to others
- "You benched yourself briefly after a bad play. Immediately un-benched yourself."
- Effects: discipline, confidence, leadership (small).

**Age 6 -- First signs of discipline**
- Can follow structured games and drills
- Begins practicing without being asked
- "You ran laps during recess 'for conditioning.' Other kids concerned."
- Effects: discipline, athleticism, durability. Flag potential: `selfStarter`.

**Age 7 -- Competition becomes real**
- Keeps score when nobody asked
- Notices who is better, tries to beat them
- "You organized a neighborhood draft. No one else understood the rules."
- Effects: confidence, leadership, footballIq (small).

**Age 8 -- Strategy and identity forming**
- Thinks about how to improve, not just playing
- Starts forming athlete identity
- "You replayed a loss in your head for two days. Adjustments planned."
- Effects: footballIq, discipline, confidence.

**Age 9 -- "This is what I do" mindset**
- Sets simple goals
- Accepts repetition as part of getting better
- "You skipped part of a birthday party to 'work on your game.' Cake still consumed."
- Effects: discipline, technique (small), footballIq.

### Stat effect rebalancing by age band

| Age band | Primary effects | Minimal/zero | Rationale |
| --- | --- | --- | --- |
| 1-3 | athleticism, health, durability, confidence | technique, footballIq | Toddlers form temperament, not skills |
| 4-6 | confidence, discipline, athleticism, leadership | technique, footballIq (rare small) | Social and behavioral formation |
| 7-9 | discipline, confidence, leadership, athleticism, footballIq (small), durability | technique (rare, small) | Pre-athletic identity, no organized coaching yet |

Effect magnitudes:
- Ages 1-3: +1 to +2 max per choice
- Ages 4-6: +1 to +3 per choice
- Ages 7-9: +1 to +3 per choice, with footballIq capped at +1

### Story flags

Events set persistent flags via the existing `sets_flag` mechanism on choices.
Later events check flags via `requires_flag` / `excludes_flag` conditions.

Planned flags and their triggers:

| Flag | Set by | Checked by |
| --- | --- | --- |
| `fearlessKid` | Bold choices at ages 2-4 (climbing, standing up) | Ages 7-9 get unique brave options |
| `poorLoser` | Meltdown choices at ages 3-5 | Ages 7-9 competition events reference it |
| `naturalLeader` | Organizing/rallying at ages 5-7 | Ages 8-9 coach reactions change |
| `selfStarter` | Practicing unprompted at ages 3-6 | Ages 7-9 training events give bonus |
| `roughAndTumble` | Physical play choices at ages 2-5 | Durability benefits at ages 7-9 |
| `quietWorker` | Quiet/observer choices at ages 4-6 | Technique and focus events at ages 7-9 |
| `showoff` | Flashy/celebrating choices | Social events reference it |
| `bookish` | Homework/studying choices | Academic events reference it |

Flag accumulation: some flags require 2+ triggering choices before they set (tracked
via intermediate counter flags like `fearless_count`). This prevents a single random
event from defining the player's personality.

### Big decisions

Increase from 1 to ~5 across childhood. These are `is_big_decision: true` and get
logged to `player.bigDecisions[]`.

Candidates:
1. **Stand up to bully or avoid** (age 5-6)
2. **Cheat in a game or play fair** (age 6-7)
3. **Include weaker kid or exclude** (age 7-8)
4. **Keep practicing after embarrassment or quit** (age 8-9)
5. **Family move** (any age, keep existing, lower weight)

### Yearly summary sentence

After each year's events resolve, display a one-line narrative summary below the
events. Generated from the player's name + flags + dominant stat changes that year.

Examples:
- "Neil was already the kid who turned every recess into a competition."
- "Neil did not always win, but almost never backed down."
- "Teachers described Neil as energetic, stubborn, and weirdly locked in."

Implementation: a `generateChildhoodSummary()` function in `kid_years.ts` that
picks from template strings based on which flags are set and which stats changed
most that year.

### Headlines update

Update `AGE_HEADLINES` to match the new tone:

| Age | Current | New |
| --- | --- | --- |
| 1 | Baby steps | Baby steps |
| 2 | Toddler life | Toddler chaos |
| 3 | Preschool days | Preschool legend |
| 4 | Starting school | Starting school |
| 5 | Kindergarten | Kindergarten |
| 6 | First grade | First grade |
| 7 | Second grade | Second grade |
| 8 | (peewee handler) | Third grade |
| 9 | (peewee handler) | Fourth grade |

### Handler changes

**`kid_years.ts`**: Map age to phase band string:
- Ages 1-3 filter on `childhood_early`
- Ages 4-6 filter on `childhood_middle`
- Ages 7+ stays with existing handler (peewee at 8-9)

Pass `player.age` to `filterEvents()` for age-specific filtering.
Add `generateChildhoodSummary()` call after events resolve.

**`events.ts`**: Add `min_age`/`max_age` to `EventConditions`. Add `age` parameter
to `filterEvents()`. Add the three new phase files to `loadEvents()`.

**`peewee_years.ts`**: Age 8-9 events now come from `childhood_late` phase (pre-season
event) instead of generic `youth`. The football season and youth events during the
season remain unchanged.

### Backward compatibility

The old `childhood.json` is replaced entirely (deleted). Since there are no saves
with event history dependencies, this is safe. The `youth.json` events remain for
in-season weekly events at ages 8+.

## Files to modify

| File | Change |
| --- | --- |
| `src/data/events/childhood.json` | Delete, replace with 3 band files |
| `src/data/events/childhood_early.json` | New: ages 1-3 events |
| `src/data/events/childhood_middle.json` | New: ages 4-6 events |
| `src/data/events/childhood_late.json` | New: ages 7-9 events |
| `src/events.ts` | Add min_age/max_age to conditions, age param to filterEvents, load new files |
| `src/childhood/kid_years.ts` | Map age to phase band, pass age to filter, add summary generator |
| `src/childhood/peewee_years.ts` | Use childhood_late for pre-season event at ages 8-9 |

## Event count target

- Ages 1-3: ~4 events per year = ~12 events total
- Ages 4-6: ~5 events per year = ~15 events total
- Ages 7-9: ~5 events per year = ~15 events total
- Total: ~42 events across 3 files

With 1-2 events shown per year and weighted selection, this gives good variety across
playthroughs.

## Verification

1. Build succeeds (`bash run_game.sh` or equivalent build command)
2. Start a new game and play through ages 1-9
3. Verify age-appropriate events appear (no toddler events at age 8)
4. Verify flags set in early years cause different events in later years
5. Verify yearly summary sentences display after events
6. Verify stat effects follow the rebalancing rules (no technique at age 2)
7. Verify big decisions log to `player.bigDecisions[]`
8. Verify peewee football season at ages 8-9 still works normally
