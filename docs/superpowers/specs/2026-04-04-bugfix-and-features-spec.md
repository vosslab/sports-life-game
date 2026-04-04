# Gameplay fixes and content expansion - round 1

Goal: improve the current prototype so it feels more believable, less repetitive,
and more like a real football life sim.

## Design values

- High school teams use fictional school names with quirky, minor-league-feel mascots
- Colleges and NFL teams remain real
- Mascot tone: 60% quirky, 30% normal-ish, 10% truly ridiculous
- Story over stats remains the core principle
- Underdog tone: setbacks create story paths, not just punishment

---

## 1. Story log and childhood event repetition

**Problem**: childhood age milestones repeat (e.g., "chased family dog" at age 1 and 3).

**Required behavior**:
- Childhood and youth milestone text should feel varied
- The exact same milestone text should not appear within a 3-5 year cooldown
- Some milestones should be age-banded (first steps at age 1, not age 2)

**Implementation**:
- Add event history tracking for non-weekly life events
- For childhood/youth milestone pools, support: minAge, maxAge, cooldownYears, tags
- When selecting a milestone, exclude exact event IDs used within cooldown
- Expand childhood event pools to at least 3-4 per age bracket

**Acceptance**: same childhood milestone does not repeat within 3-5 years.
First 10 years feel meaningfully varied across one playthrough.

---

## 2. Story log auto-scroll

**Problem**: story pane does not auto-scroll when new content is added.

**Required behavior**: whenever a new story entry is appended, scroll to show it.
Applies to age advances, weekly results, event resolutions, milestones.

**Implementation**:
- After render completes, use `requestAnimationFrame()` or `setTimeout(fn, 0)`
  before setting scrollTop
- Apply to all append functions: `addStoryHeadline()`, `addStoryText()`,
  `addResult()`, `clearStory()` divider
- Scroll `#story-panel` (the scrollable container), not `#story-log` (inner div)
- Also scroll after `showChoices()` renders new buttons

**Acceptance**: clicking Continue always reveals the latest entry without
manual scrolling.

---

## 3. More options everywhere

**Problem**: too many moments have only 1-2 choices.

**Required behavior**: increase choice density across all phases.

**Implementation**: add more choice points in childhood, youth, HS weekly loop,
offseason, recruiting, academics, injury management, social situations.

Target:
- At least 70% of event cards present 2+ choices
- Major life events have 2-4 choices
- Post-game should offer choices (celebrate, watch film, rest)
- Offseason should have multiple choices, not just "next season"
- College seasons should have 4-5 choices (currently 3-4)

**Acceptance**: player rarely goes several ages or weeks without meaningful input.

---

## 4. More classroom and school-life content

**Problem**: the sim is football-only, needs school/academic content.

**Required behavior**: add academic event category throughout middle school,
high school, and college.

**Events to add** (tag: "academic"):
- Quiz/test performance
- Teacher conflict
- Group project
- Skipping class
- Tutoring offer
- Detention
- Eligibility warning
- Balancing homework and practice
- Friend drama at school
- Presentation/day-of-game stress
- Report card moments

**Implementation**:
- New event tag group: "academic"
- Expand events.json with 10+ school-life events
- Some academic events depend on academic standing
- Some football events reference academics

**Acceptance**: high school no longer feels football-only. School life
regularly affects gameplay.

---

## 5. Tie games are not losses

**Problem**: 39-39 game says "fell short" (treated as loss).

**Required behavior**: ties handled correctly in narrative and standings.

**Implementation**:
- Audit all score comparison logic: `>` = win, `<` = loss, `===` = tie
- Update team record model to support ties
- Update result text for ties: "A hard-fought battle ends in a 39-39 tie."
- Playoff games cannot end in ties (simulate overtime to force winner)
- Regular season ties are OK (rare but possible)
- Change `GameResult.teamWon` from boolean to `'win' | 'loss' | 'tie'`

**Acceptance**: no result says "fell short" when scores are tied. Standings
reflect ties correctly. Playoffs always have a winner.

---

## 6. Unrealistic high school switching

**Problem**: player changes high school each season (should stay at one school).

**Required behavior**: player stays at one high school unless explicitly transferring.

**Implementation**:
- Generate high school team ONCE at start of freshman year
- Store persistent `schoolId` / team reference
- Do NOT regenerate school each season
- Regenerate the SCHEDULE each year (new opponents) but same school name/coach
- Team strength can improve slightly each year (+2-5)
- Transfers happen only through controlled events/decisions with story explanation
- Add transfer reasons: family move, coaching fallout, better opportunity

**Acceptance**: normal playthrough involves one high school. Multiple changes
are rare and explained.

---

## 7. State championship frequency and playoff consistency

**Problem**: too easy to win state, and playoff/story results appear inconsistent.

**Required behavior**: state championships are rare and meaningful. Playoff
messaging is internally consistent.

**Implementation**:
- Increase playoff opponent strength:
  - Regional: 65-80 (was 60)
  - State Semifinal: 75-90 (was 75)
  - State Final: 85-98 (was 90)
- Add "playoff intensity" modifier (+10-15 to opponent effective strength)
- Player needs higher confidence to perform under pressure
- Only one final season result per season
- No season should both "win state" and later "lose in playoffs"
- Track championships in career history as rare achievement

**Acceptance**: average player does not win state repeatedly. Championship
event fires only when championship game is actually won.

---

## 8. Weekly conference standings view

**Problem**: player wants to see conference standings after each week.

**Required behavior**: after each game week, show standings for conference.

**Implementation**:
- Generate a conference of 8-12 teams at start of each level
- Store conference teams with names and records
- After each game, simulate results for other conference teams
- Show standings accessible from UI:
  ```
  Conference Standings (Week 4):
  1. Westfield Possums      4-0
  2. Lincoln Catfish         3-1
  3. North Valley Raccoons   3-1
  4. [Your team]             2-2
  ...
  ```
- Highlight player's team
- Playoff qualification based on conference standing (top 4 make it)

**Acceptance**: after each week, complete conference standings are viewable.

---

## 9. Driver's license milestone

**Problem**: getting a driver's license is a memorable teen milestone.

**Required behavior**: at age 16, trigger a meaningful milestone event.

**Implementation**:
- Guaranteed event at age 16 (not random)
- Choices: take test now, practice more first, not interested yet
- Pass/fail based on discipline stat
- If pass: set flag `has_drivers_license`, unlock future events
  (drive teammates, road trip to away game)
- If fail: retry at 17
- Story: "You got your license! Freedom never felt so good."

**Acceptance**: driver's license appears as a memorable mid-high-school moment.

---

## 10. Academic performance and consequences

**Problem**: academics should affect eligibility and college path.

**Required behavior**: academic system runs alongside football performance.

**Implementation**:
- Add `gpa` stat to Player (0.0-4.0, starts at 2.5)
- GPA changes based on choices (study vs skip, academic events)
- Weekly focus adds "Study" as 6th option (boosts GPA)
- GPA checks at season checkpoints:
  - >= 2.0: eligible
  - 1.5-1.99: probation, must focus on school or get suspended
  - < 1.5: ineligible for season
- GPA affects recruiting:
  - >= 3.0: any college
  - 2.0-2.99: normal recruiting
  - < 2.0: must attend junior college first (1-2 JUCO seasons, then transfer)
- JUCO path: smaller programs, less exposure, but can still reach D1

**Acceptance**: academics can materially change football path. Poor academics
create real setbacks. Recovery is possible.

---

## 11. Silly high school mascots

**Problem**: current mascots are generic (Eagles, Panthers).

**Required behavior**: high school mascots should be quirky and fun, like
minor league baseball teams.

**Implementation**:
- Split team names into prefix + mascot in `src/data/names.json`
- Replace generic mascots with silly/memorable ones:
  - Quirky (60%): Possums, Catfish, Yard Dogs, Moon Pies, Skunks, Buzzards,
    Mud Hoppers, Raccoons, Crawdads, Armadillos, Honey Badgers, Thunder Chickens,
    Sand Gnats, Grasshoppers, Lake Monsters, Belly Floppers, Hound Dogs
  - Normal (30%): Bulldogs, Knights, Wildcats, Trojans, Spartans
  - Truly ridiculous (10%): Fighting Artichokes, Banana Slugs, Dust Bunnies,
    Soggy Waffles, Velvet Hammers
- Keep school prefixes realistic: Westfield, Pine Bluff, Lakeview, Milltown
- Keep mascot names short enough for standings UI
- Result: "Westfield Possums", "Lakeview Catfish", "Milltown Yard Dogs"

**Acceptance**: high school names are memorable and fun. Each playthrough
generates unique silly team names.

---

## 12. Ideas from study repos

Features adapted from life-simulator and Life-Simulator1 reference repos:

### Relationship tracking (from life-simulator)
- Track relationship scores with key people: parents, coach, teammates, rival
- Parent relationship affects support and recruiting help
- Coach relationship affects playing time and opportunities
- Store as `relationships: Record<string, number>` (0-100 scale)

### Age-gated activities (from life-simulator)
- Unlock new options as player ages:
  - Age 8+: join sports
  - Age 14+: part-time job
  - Age 16+: drive, date
  - Age 18+: sign contracts, NIL
- Show locked activities as grayed out with age requirement

### Free time / offseason activities (from life-simulator)
- Offseason choices: gym, read/study, hang with friends, part-time job, volunteer
- Each has stat trade-offs and money implications

### Actions-per-period limiter (from life-simulator)
- Limit stat-boosting activities per week/season
- Prevents grinding one stat to 100 in childhood
- Forces meaningful trade-offs

---

## 13. Team-based color theming

**Rule**: The background and font colors should inherit from the player's
current team palette.

**Requirements**:
- Colors generated at runtime from the active team palette
- Randomly choose from approved team-color combinations, not arbitrary full-spectrum
- Every combination must pass a readability check before use
- Text, buttons, stat bars, modals, and status bar stay visually consistent
  with the active team identity

**Color generation logic**:
1. Load the current team palette (2-3 colors per team)
2. Randomly select: one primary background, one accent, one text color
3. Evaluate contrast between background and text
4. If contrast fails WCAG AA threshold, discard and regenerate
5. Apply validated combination across the UI

**Contrast rules**:
- Normal text: WCAG AA minimum (4.5:1 ratio)
- Large text/headers: 3:1 ratio minimum
- If team palette is too low-contrast, automatically:
  - Darken the background, or
  - Lighten the text, or
  - Fall back to neutral white/near-black text

**Fallback behavior**:
- If no random pair passes after several attempts:
  - Use team primary color for background
  - Use white or near-black text (whichever has higher contrast)
  - Use accent colors only for borders, buttons, highlights

**Implementation**:
- Each team gets a palette: `{ primary: string, secondary: string, accent: string }`
- High school teams: randomly generate palettes at team creation
- College/NFL teams: use real team colors (or generated for fictional)
- Apply via CSS custom properties (override `--bg-primary`, `--bg-secondary`,
  `--accent-*`, `--text-primary` etc.)
- Palette changes when player changes teams (new school, college, NFL draft)
- Store palette in save data so it persists across sessions

---

## Priority order

### Priority 1: correctness / bugs
1. Tie handling (BUG)
2. Playoff/championship consistency (BUG)
3. Persistent high school assignment (BUG)
4. Auto-scroll (BUG)

### Priority 2: core feel improvements
5. Repeated milestone prevention
6. Silly mascots
7. More options everywhere
8. More classroom content
9. Standings view

### Priority 3: progression depth
10. Driver's license milestone
11. Academics and junior college path
12. Relationship tracking
13. Age-gated activities

---

## Files likely affected

| File | Changes |
| --- | --- |
| `src/main.ts` | Bugs 1-4, 6-7, features 1-3, 8-9 |
| `src/week_sim.ts` | Bug 5 (tie handling) |
| `src/team.ts` | Bug 6 (persistent team), feature 8 (conference) |
| `src/player.ts` | Features 10, 12 (gpa, relationships) |
| `src/data/events.json` | Features 3, 4, 9 (more events) |
| `src/data/names.json` | Feature 11 (silly mascots) |
| `src/college.ts` | Feature 10 (JUCO path, GPA check) |
| `src/ui.ts` | Feature 8 (standings display) |
| `styles.css` | Feature 8 (standings styling) |

---

## Definition of done

- Story log keeps prior ages and auto-scrolls
- Childhood events do not obviously repeat
- Ties are never called losses
- School identity remains stable unless story explains a transfer
- State titles are rare and consistent
- Weekly standings are visible
- School/classroom life is present
- Driver's license exists as a real milestone
- Academics can affect eligibility and college path
- High school mascots are silly and memorable
