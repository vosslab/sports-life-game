# Football career life simulator - design spec

A BitLife-style American football career simulator with weekly choices,
stat-based performance simulation, and long-term progression from birth to legacy.

## One-sentence spec

Choices -> simulation -> consequences -> long-term career story.

## Core concept

- **BitLife UI/UX**: stat bars, short event cards, one-tap choices, compact summaries
- **The Show '26 career texture**: progression feel, stat growth, milestones, awards,
  rankings, recruiting, draft stock, season summaries, records, legacy
- **Simulation only**: no playable on-field action, no play calling, no drive logic
- **Football career life sim**: not a football game with playable matches

The game lives or dies on event writing, career pacing, stat feedback, satisfying
summaries, and meaningful choices.

## Narrative design rules

- Show story first, numbers second
- Most weeks should feel quick
- At least one major decision per season should have lasting consequences
- Failure should create new story paths, not just punishment

## Game tone and feel

Based on co-designer (12-year-old daughter) input:

- **Underdog-first**: fighting for spots, earning attention, setbacks matter.
  Success should feel earned, not guaranteed.
- **Story over stats**: narrative feedback on the surface, numbers underneath.
  Instead of "+3 Skill", show "Your extra reps are paying off. Coaches are
  starting to trust you more."
- **Big decisions are the fun part**: every season should have 1-3 major decision
  moments (switch positions, transfer, play through injury, commit to college,
  enter draft early, demand trade).
- **Serious + chaotic**: dramatic football story where things can go wrong, not
  a clean progression simulator. More ups and downs, more unexpected events.
- **Event priority**: rival drama, injuries, and recruiting are the most
  interesting. Deprioritize generic life filler.
- **NFL is the most important phase**: the ultimate destination. Reaching it
  should feel special. Build it as the second deep system after high school.
- **Serious + chaotic**: grounded football career story with occasional dramatic
  or chaotic BitLife-style twists. Surprise events, unexpected setbacks, wild
  moments mixed into a realistic career arc.
- **Stats stay behind the scenes**: stats drive outcomes, but the player mostly
  experiences them through story text, headlines, milestones, and career
  consequences. Numbers are visible but secondary to narrative.

## Tech stack

- Vanilla TypeScript + HTML/CSS
- No framework (no React, no Svelte)
- Mobile-first for iPad Safari
- Static hosting (GitHub Pages, Netlify, or Vercel)
- No build tool beyond tsc (TypeScript compiler)
- Game state saved to localStorage

## Project structure

```
src/
  main.ts              - game startup, loop orchestration
  player.ts            - player state: stats, age, position, injuries, career history
  team.ts              - team roster, coach quality, record, rivals
  season.ts            - schedule, standings, week progression, offseason
  week_sim.ts          - weekly performance simulation (stat-based outcomes)
  events.ts            - event engine: load, filter, display, resolve
  career.ts            - career phases, promotion, recruiting, draft, contracts
  ui.ts                - rendering: stat bars, text, buttons, modals, screens
  save.ts              - localStorage save/load
  data/
    events.json        - event card definitions
    positions.json     - position stat weights and performance outputs
    names.json         - name pools for generated characters
    teams.json         - school/team name pools (real NFL/college, made-up HS)
index.html             - single page app
styles.css             - mobile-first CSS
tsconfig.json          - TypeScript config
```

## Stat system

### Core stats (visible, 0-100 scale)

| Stat | Description | Growth |
| --- | --- | --- |
| Athleticism | Raw physical talent: speed, strength, agility | Grows in youth, peaks mid-career, declines late |
| Technique | Position-specific mechanics and fundamentals | Grows with training, slow but steady |
| Football IQ | Reading defenses, play recognition, decision making | Grows with film study, experience |
| Discipline | Training consistency, staying out of trouble | Affected by choices (parties vs practice) |
| Health | Injury resistance and recovery speed | Fluctuates with injuries, rest, age |
| Confidence | Performance under pressure, clutch factor | Rises with wins/good games, drops with losses/benching |

### Career stats (visible, different scales)

| Stat | Description |
| --- | --- |
| Popularity | 0-100. How well-known you are. Affects recruiting, NIL, sponsors, draft stock |
| Money | Dollar amount. Allowance (youth), NIL (college), contracts (NFL) |

### Hidden stats

| Stat | Description | Range |
| --- | --- | --- |
| Size | Height/weight class (1=small, 5=large). Set at birth, influences position fit and line play | 1-5 |
| Leadership | Team chemistry contribution. Affects team performance modifier | 0-100 |
| Durability | Long-term injury proneness vs. single-game Health | 0-100 |

Size uses a simple 1-5 scale (not 0-100) representing body frame:
- 1-2: small/quick (fits CB, WR, K)
- 3: medium (fits QB, RB, LB, S)
- 4-5: large (fits OL, DL, TE)
Size is set at birth with some growth during youth. Used for position suggestions
and line position performance. Not shown in main UI.

### Birth stats

At birth, all core stats get random initial values (weighted distribution):
- Athleticism, Health: higher variance (some kids are naturally gifted)
- Technique, Football IQ: start low (learned skills)
- Discipline, Confidence: moderate random range
- Size: random height/weight genetics that grow with age

## Career progression

| Age | Phase | Loop style | Detail level |
| --- | --- | --- | --- |
| 0-9 | Childhood | Year-by-year summary | Quick choices, stat reveals, sport interest |
| 10-13 | Youth football | Season-by-season | General athlete, basic season results |
| 14-17 | High school | **Weekly** (deep) | Full weekly loop. Position discovery, recruiting, rivals |
| 18-21 | College | Season-by-season (v1) | Summary choices, recruiting, NIL, bowl games |
| 22-35+ | NFL | **Weekly** (second deep system) | Contracts, trades, injuries, awards, legacy |
| Retire | Legacy | One-time | Career summary, hall of fame check, final stats |

### Build priority order

1. High school = first fully built system (weekly loop)
2. NFL = second fully built system (weekly loop)
3. College = stays simpler, fill in later

### Phase: Childhood (0-9)

Keep this fast. Just a few clicks, not drawn out.

Year-by-year clicks. Each year:
- Brief life event (BitLife-style one-liner with story text)
- Occasional choice that shapes stats
- At age 8-9: "Do you want to play football?" moment
- Stat growth happens passively based on birth values

### Phase: Youth football (10-13)

Season-by-season. Each season:
- Player is a general athlete (no fixed position yet)
- Season summary with a few key moments
- Stat growth based on effort and natural ability
- Coaches notice your strengths/weaknesses
- Hints about what position might fit

### Phase: High school (14-17) - DEEP

Weekly loop during season (~12 regular season weeks + playoffs).
Offseason: condensed summary screens with key choices.

#### Position discovery

Position is NOT chosen at birth. In early high school:
- Coach suggests a position based on your Size + stats
- Player can accept, request a different position, or try out for multiple
- This is a major early decision moment
- Position can be changed later (another big decision)

#### Weekly loop

```
Week Start
  1. Choose weekly focus (pick one):
     - Train (boost Technique)
     - Film Study (boost Football IQ)
     - Recovery (boost Health)
     - Social / Reputation (boost Popularity)
     - Teamwork / Leadership (boost Leadership, team chemistry)

  2. Random event (30-40% chance):
     - Event card appears with 2-3 choices
     - Choices affect stats, relationships, career
     - Occasional "major decision week" with high-impact choices

  3. Game day simulation:
     - Performance calculated from stats + team quality + randomness
     - Position-specific stat line generated
     - Team result (win/loss/score) separate from player performance

  4. Results screen:
     - Story-first feedback ("You dominated the second half...")
     - Your stat line for the game
     - Team score and record
     - Stat changes from the week
     - Recruiting interest updates (junior/senior year)

  5. Advance to next week
```

#### Season structure

- Preseason: 2 weeks (tryouts, depth chart, position battles)
- Regular season: 10-12 weeks
- Playoffs: 1-4 weeks (if team qualifies)
- Offseason: summary screen with key choices
  - Train in offseason
  - Pick up a new skill
  - Deal with life events
  - Recruiting visits (junior/senior year)

#### Big decisions in high school (1-3 per season)

- Switch positions
- Fight for starting spot vs accept backup role
- Play through minor injury vs rest
- Transfer to a different school
- Commit to a college (senior year)
- Respond to rival trash talk
- Skip class for extra practice

### Major decision system

Every season includes 1-3 major career decisions. These are bigger than normal
weekly events and have long-term consequences tracked in the story log and
career history.

Examples by phase:
- **HS**: switch positions, fight for starting spot, transfer schools, play
  through injury, commit to college, respond to rival
- **College**: transfer portal, red-shirt, enter draft early, NIL deal
- **NFL**: demand trade, hold out for contract, play through injury, retire,
  mentor young player, switch teams in free agency

Major decisions are flagged with `is_big_decision: true` in events.json and
receive special UI treatment (full-screen card, dramatic text).

### Phase: College (compressed but meaningful)

Season-by-season. Each season:
- 2-3 key choices per season
- Season performance summary based on stats
- NIL deal opportunities
- Draft stock tracking (junior/senior year)
- Transfer portal option
- Big decisions: enter draft early, transfer, red-shirt

### Phase: NFL (most important destination, second deep system)

The NFL is what the player is working toward the whole game. Reaching it
should feel like a payoff, not just another phase.

First version: playable season-by-season with meaningful choices and drama.
Later upgraded to full weekly loop.

When fully built, uses the same weekly loop as high school but with:
- Contract negotiations and free agency
- Trade demands and team changes
- Real NFL team names
- Injury risk increases with age
- Pro Bowl, All-Pro, MVP awards
- Media spotlight and endorsements
- Retirement decision when stats decline
- Hall of Fame trajectory

**First version**: season-by-season with real team names, meaningful contract
decisions, and career milestones. Playable and satisfying, then deepened to
weekly loop later.

### Phase: Legacy

One-time summary:
- Career stats and records
- Awards and achievements
- Hall of Fame eligibility
- Final legacy score
- Story recap of career highlights

## Position system

All positions playable. Positions are discovered in early high school based on stats.
Because this is simulation-only, positions are handled abstractly through position
buckets with stat weights and output types.

### Position buckets (first build)

| Bucket | Positions | Primary stats | Performance outputs |
| --- | --- | --- | --- |
| Passer | QB | Football IQ, Technique, Confidence | Pass yards, TDs, INTs |
| Runner/Receiver | RB, WR, TE | Athleticism, Technique | Yards, TDs, catches |
| Lineman | OL, DL | Size, Technique, Discipline | Grade (A-F), key plays |
| Defender | LB, CB, S | Athleticism, Football IQ | Tackles, sacks, INTs |
| Kicker | K, P | Technique, Confidence | FG%, punt avg |

Later versions split buckets into individual positions with unique formulas.

### Position fit

Size + stats determine which positions your player fits naturally.
Coach suggests position in early HS based on these.
Players can switch positions (big decision), but performance may suffer if stats
don't match the new position's requirements.

## Team and opponent system

### Team names

- **NFL**: real team names (Patriots, Cowboys, etc.)
- **College**: real school names (Alabama, Ohio State, etc.)
- **High school**: procedurally generated names
- **Setting toggle**: "Use real names" or "Use fun/made-up names" for all levels

### Team state (src/team.ts)

Each team tracks:
- **Team strength**: overall quality rating (1-100)
- **Depth chart**: player's position on it (starter, backup, bench)
- **Coach personality**: supportive, demanding, or volatile (affects events)
- **Playing time**: earned through performance and choices
- **Roster competition**: other players at your position who threaten your spot

Underdog mechanics depend on team state:
- Starting as backup is common for freshmen
- Must earn starter role through good weeks and choices
- Coach personality affects how hard it is to earn playing time
- Team strength affects win/loss record independent of player

### Rivals

Rival characters are generated and persist across seasons:
- Named rival players at your position or on opposing teams
- Rivalry events trigger based on schedule and history
- Rival performance compared to yours affects recruiting/draft stock

## Event system

Events are data-driven JSON. Content can be designed in a spreadsheet and converted.
Story text is the primary output, not stat numbers.

### Event card format

```json
{
  "id": "rival_trash_talk_pregame",
  "title": "Rival Runs His Mouth",
  "description": "Your biggest rival just posted about how he is going to shut you down this Friday.",
  "phase": "high_school",
  "tags": ["rival", "social", "confidence"],
  "weight": 5,
  "is_big_decision": false,
  "conditions": {
    "min_week": 3,
    "positions": [],
    "min_stats": {},
    "max_stats": {}
  },
  "choices": [
    {
      "text": "Fire back on social media",
      "effects": {
        "confidence": 3,
        "popularity": 5,
        "discipline": -2
      },
      "flavor": "Your clap-back goes viral at school. Coach is not thrilled, but the team loves it."
    },
    {
      "text": "Let your play do the talking",
      "effects": {
        "discipline": 3,
        "confidence": 1
      },
      "flavor": "You keep your head down. Your teammates respect the quiet confidence."
    },
    {
      "text": "Confront him at school",
      "effects": {
        "confidence": 2,
        "discipline": -5,
        "popularity": 3
      },
      "flavor": "Things get heated in the hallway. You almost get suspended."
    }
  ]
}
```

### Event fields

| Field | Purpose |
| --- | --- |
| id | Unique identifier |
| title | Card headline |
| description | Situation text (story-first) |
| phase | Which career phase (childhood, youth, high_school, college, nfl) |
| tags | Filtering: position, category, theme |
| weight | Rarity (higher = more common) |
| is_big_decision | Flag for major career-altering choices |
| conditions | When event can fire (week, position, stat thresholds) |
| choices | Array of options with effects and flavor text |

### Follow-up events and persistent flags

Some storylines span multiple weeks or seasons (rivalries, injuries, recruiting).
Support this through:
- `sets_flag`: event sets a named flag on the player state (e.g., "rival_feud_active")
- `requires_flag`: event only fires if a flag is set
- `clears_flag`: event resolves a storyline and removes the flag

This allows multi-step stories like:
1. Rival trash talks you (sets "rival_feud_active")
2. Next week: rival outperforms you (requires "rival_feud_active")
3. Big game showdown (requires "rival_feud_active", clears flag)

### Event content priorities (first build: 30-40 events)

| Category | Count | Priority |
| --- | --- | --- |
| Rival drama | ~10 | HIGH - most fun per co-designer |
| Injury scenarios | ~8 | HIGH - play through pain, recovery choices |
| Recruiting moments | ~8 | HIGH - college scout visits, offer letters |
| Coach/team | ~5 | MEDIUM - benching, praise, conflict |
| Academic/social | ~4 | MEDIUM - eligibility, parties, grades |
| Big decisions | ~5 | HIGH - position switch, transfer, commit |

Deprioritize generic life filler. Every event should have football stakes.

### Story-first feedback

All stat changes should be accompanied by narrative text:

| Instead of | Write |
| --- | --- |
| "+3 Technique" | "Your footwork is getting sharper every practice." |
| "-5 Health" | "That hit in the third quarter is still bothering you." |
| "+5 Popularity" | "The local paper ran a feature on you this week." |
| "-3 Confidence" | "After that interception, the doubt is creeping in." |

## Performance simulation (week_sim.ts)

Each game week produces two separate results:

### Player performance

1. Calculate base performance from position-weighted stats
2. Apply weekly focus bonus (+5-10% to trained stat area)
3. Apply confidence modifier (high confidence = clutch, low = shaky)
4. Add randomness (good/bad game variance, upsets happen)
5. Generate position-specific stat line
6. Rate performance: Poor / Below Average / Average / Good / Great / Elite
7. Write a story sentence for the performance

### Team result

1. Team has a quality rating (varies by school/program)
2. Opponent has a quality rating (schedule-based)
3. Player performance contributes to team (weighted by position importance)
4. Add randomness for upsets
5. Generate score and win/loss

### Key principle

Player can play well in a loss and badly in a win. These are separate.

### Underdog mechanics

- Starting as backup is common (not guaranteed starter)
- Must earn playing time through stats and choices
- Bad teams can have great individual players
- Being overlooked creates recruiting drama
- Upsets and breakout games feel more exciting

### Recruiting/draft effects

- Good performances boost recruiting interest / draft stock
- Bad performances lower it
- Big games (rivals, playoffs) have multiplied impact
- Awards (player of the week, all-conference) from standout performances

## UI design

### Layout (mobile-first, iPad optimized)

```
+----------------------------------+
|  Name  |  Pos  |  School/Team    |
|  Age 15 | Week 4/12 | Season 1  |
+----------------------------------+
| Athleticism  [========--]  80    |
| Technique    [======----]  60    |
| Football IQ  [=====-----]  50    |
| Discipline   [=======---]  70    |
| Health       [==========-] 95   |
| Confidence   [======----]  55    |
| Popularity   [===-------]  30    |
+----------------------------------+
|                                  |
|  [Story text / event card]       |
|                                  |
|  Your rival just called you out  |
|  on social media before the big  |
|  game Friday...                  |
|                                  |
|  +----------------------------+  |
|  |    Fire back online        |  |
|  +----------------------------+  |
|  |    Let your play talk      |  |
|  +----------------------------+  |
|  |    Confront him at school  |  |
|  +----------------------------+  |
|                                  |
+----------------------------------+
| Record: 3-1 | Recruiting: 2 stars|
+----------------------------------+
```

### Design principles

- **Big choice buttons**: large, clear, tap-first design for iPad
- BitLife-style presentation: text-heavy, minimal graphics
- Story text is prominent (not buried under numbers)
- Stat bars with color coding (green = high, red = low)
- Scrolling story log (like BitLife's year log)
- Modal popups for events
- No dense tables or management sim screens
- Minimal clutter, no small links or complex menus
- Occasional milestone screens for big moments

### Screen types

| Screen | When |
| --- | --- |
| Birth / character creation | Game start |
| Year summary | Childhood, offseason |
| Position discovery | Early high school |
| Weekly focus choice | Each week during season |
| Event card (modal) | Random events and big decisions |
| Game result | After each game |
| Season summary | End of season |
| Recruiting / draft | HS junior/senior, college |
| Milestone | Awards, records, promotions |
| Legacy / retirement | Career end |

## Save system

- localStorage for browser persistence
- Autosave on every state change (not just week advance)
- Single save slot (v1)
- Save format: JSON blob of full game state

## Build and deploy

- TypeScript compiled with `tsc` to JavaScript
- Output to `dist/` folder
- `tsconfig.json` targets ES2020 modules for modern browser support
- Single `index.html` loads compiled JS via `<script type="module">`
- `npm run build` = `tsc` (single command build)
- `npm run dev` = `tsc --watch` for development
- Deploy `index.html` + `styles.css` + `dist/` + `src/data/` to any static host
- No server required, no bundler required

## Future expansion targets

- NFL: upgrade to full weekly loop (priority 2 after HS)
- College: upgrade to weekly loop (priority 3)
- Multiple save slots
- Career comparison / leaderboards
- Split position buckets into individual positions
- Deeper relationship system (coaches, teammates, agents)
- Injury rehabilitation mini-choices
- Dynamic difficulty based on school/team tier
- Daughter-designed content packs (rival characters, scenarios)
