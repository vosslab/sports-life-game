# Ideas list

Raw ideas from brainstorming sessions. Not committed to building these,
just capturing them for future reference.

## From co-designer (daughter)

- Silly mascots like minor league baseball (implemented)
- All ages visible in scrollable timeline like BitLife (implemented)
- See all schools in conference standings after each week (implemented)
- See entire season schedule of games (implemented)
- College games should have non-conference and conference games (implemented)
- Better status bar for all levels
- More choices everywhere
- More classroom and school content
- Position should be discovered later, not chosen at birth (implemented)
- NFL is the most important phase
- Big decisions are the most fun part
- Rival drama, injuries, recruiting are the best events
- Underdog stories over superstar stories
- Real NFL and college teams, made-up high schools (implemented)
- Allow user to choose funny names or real teams
- Multiple save slots to play different characters

## From BitLife spec comparison

### UX patterns we should adopt
- **Bottom tab navigation**: BitLife has persistent tabs (Life, Relationships,
  Activities, Assets, Career). We have no tabs - everything is sequential.
  Adding a tab bar is the single highest-impact UX improvement.
- **Activities hub**: central menu for optional actions organized by category
  (Health, Mind, Crime, Social). Users can do things between events, not just
  react to what the game gives them.
- **Profile screen**: tap your name to see full details, traits, career history.
  Family members, coaches, rivals also have clickable profiles.
- **Relationship interaction UI**: list of people you know, each clickable for
  actions (spend time, argue, gift). Not just a hidden score.
- **Disabled actions shown grayed out**: show locked options with age requirement
  so players know what's coming. Creates anticipation.
- **Achievements and ribbons**: end-of-life awards based on how the character
  lived (e.g., "Scholar" ribbon, "Troublemaker" ribbon, "Legend" ribbon).
  Adds replay motivation.
- **Fast restart**: immediate new life option after death with minimal setup.

### Design principles from BitLife
- "Soft simulation": directional control + hidden randomness. Player feels in
  charge but outcomes stay unpredictable.
- Core engagement = fast life-story generation through repeated meaningful choices
- Replay value = short runs, many goals, hidden outcome variance
- Player fantasy = test "what if" lives with low friction and high consequence
- BitLife uses only 4 visible stats (Health, Happiness, Smarts, Looks). We show
  7. Consider: are we showing too many stats? Or does football justify more?
- Passive stat drift each year (we do this in childhood but not consistently later)

### Stat simplification question
BitLife: 4 stats. The Show: many attributes but grouped by category.
Our game: 7 visible + 3 hidden. Options:
- Keep 7 visible (football justifies the detail)
- Reduce to 5 visible, hide the rest (simpler, more BitLife-like)
- Group stats into categories with expandable detail
- Decision: table this until playtesting shows whether players are overwhelmed

## From The Show '25/'26 expanded spec

### Engagement model (why it stays fun)
- "Consistency with variation": same rules/controls, but context always changes.
  We need this for weekly loop - same structure, different situations each week.
- Short feedback cycles: action -> result in seconds. Our choices should resolve
  quickly, not require reading paragraphs.
- Near-miss effect: "almost perfect" feels different from "bad". Performance
  ratings should have more granularity near the top (great vs elite matters).
- Anticipation + risk/reward: the weekly focus choice should feel like a bet.
  "Do I train or rest before the big rivalry game?"
- Identity building: player stats and decisions accumulate into a recognizable
  career identity. Career summary should feel like a biography.

### Simulation realism from The Show
- **Team rating formula**: avg player rating + chemistry modifier + coach modifier.
  We should add chemistry (from teamwork focus) and coach bonus to team strength.
- **Scout visibility score**: make recruiting a visible growing number, not just
  stars revealed at season end. Show "scout interest: 47/100" that updates weekly.
- **Pre-draft showcase events**: combine/pro day as a playable event before NFL draft.
- **Fatigue nonlinear**: health decline should accelerate, not be linear.
  Playing through injuries makes future injuries more likely.
- **Potential ceiling**: each player should have a hidden max for each stat.
  Some players peak at 80 athleticism, others at 95. Creates natural variety.
- **Skill growth tied to specific actions**: training technique should improve
  technique. Film study should improve IQ. Currently all growth is per-focus,
  but game performance should also drive growth (good passing game = technique up).

### Awards system improvements
- Player of the Week: probabilistic, not guaranteed (implemented)
- Seasonal awards: MVP, All-Conference, All-American should use voter simulation
  with bias for market size, team success, and narrative moments
- End-of-career awards: track career totals for Hall of Fame eligibility

### Dynamic story layer
- Rivalries should be persistent named characters, not just events
- Coach relationships should affect playing time and development speed
- Media pressure should affect confidence (high popularity = more scrutiny)

## From study repos (life-simulator, Life-Simulator1)

- Relationship tracking with family members (partially implemented)
- Age-gated activities (unlock options at certain ages)
- Free time activities that cost money but boost stats
- Actions-per-period limiter to prevent grinding
- Salary tax brackets for NFL contracts
- Social media system (followers, viral moments)
- Criminal record / trouble system (suspensions, arrests)

## UI and feel ideas

- Team-based color theming (implemented)
- **Bottom tab bar**: Life | Stats | Schedule | Roster | Settings (from BitLife)
- Stat bar animations on change (pulse or glow when stat changes)
- Milestone celebration screens (full-screen moments for big events)
- Career timeline view (visual summary of whole career as a scrollable graphic)
- Photo day / player card screen (like a trading card with your stats)
- Hall of Fame ceremony screen
- Draft day TV-style presentation (round-by-round with commentary text)
- Newspaper headlines after big games ("FRESHMAN PHENOM LEADS UPSET")
- Post-game choice screen (celebrate, film study, rest)
- Offseason activity menu (not just "next season" button)

## Gameplay depth ideas

- Position battles with named competitors
- Injury rehabilitation mini-choices
- Combine/pro day simulation before NFL draft
- Endorsement deals with brand names
- Retirement career options (coaching, broadcasting, business)
- Legacy mode: play as your character's child
- Difficulty settings (easy/normal/hard)
- Speed run mode (compressed career)
- "What if" mode: replay a career with different choices at key moments
- Historical mode: start in a specific era (1970s football vs modern)
- Rivalry tracker: named rivals who persist across seasons with their own stats
- Injury history: past injuries increase future injury risk at same body part
- Weather effects: rain/snow games affect performance differently by position
- Home/away game distinction: home games boost confidence, away reduces it
