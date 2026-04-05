# Autoplay test findings

Results from running `tests/autoplay.mjs` and manual Playwright inspection on 2026-04-05.

## Clicks per year of life

Each row shows the number of button clicks the autoplay script needed to complete
one year of the player's life. "Choices" are modal popup decisions (weekly focus,
events). "Activities" are choices-panel buttons (Game Day, activity selections).
"Next/Continue" are main action bar advances.

| Age | Phase | Total | Choices | Activities | Next/Continue |
| --- | --- | --- | --- | --- | --- |
| -1 | Pre-game | 2 | 0 | 1 | 1 |
| 0 | Childhood | 1 | 0 | 0 | 1 |
| 1 | Childhood | 2 | 1 | 0 | 1 |
| 2 | Childhood | 2 | 1 | 0 | 1 |
| 3 | Childhood | 2 | 1 | 0 | 1 |
| 4 | Youth | 3 | 2 | 0 | 1 |
| 5 | Youth | 3 | 2 | 0 | 1 |
| 6 | Youth | 3 | 2 | 0 | 1 |
| 7 | Youth | 3 | 2 | 0 | 1 |
| 8 | Travel team | 2 | 1 | 0 | 1 |
| 9 | Travel team | 2 | 1 | 0 | 1 |
| 10 | Travel team | 2 | 1 | 0 | 1 |
| 11 | Travel team | 2 | 1 | 0 | 1 |
| 12 | Travel team | 2 | 1 | 0 | 1 |
| 13 | Travel team | 2 | 1 | 0 | 1 |
| 14 | HS freshman | 38 | 23 | 3 | 12 |
| 15 | HS sophomore | 39 | 23 | 3 | 13 |
| 16 | HS junior | 41 | 24 | 4 | 13 |
| 17 | HS senior | 40 | 25 | 4 | 11 |
| 18 | College freshman | 38 | 24 | 1 | 13 |
| 19 | College sophomore | 44 | 26 | 3 | 15 |
| 20 | College junior | 47 | 27 | 4 | 16 |
| 21 | College senior | 46 | 28 | 5 | 13 |
| 22 | NFL rookie | 1148* | 3 | 1144 | 1 |

(*) Age 22 is inflated by the NFL `advanceWeek` bug -- 1144 failed "Game Day"
clicks that error without advancing.

### Observations from click data

- **Childhood (0-3)**: 1-2 clicks per year. Very fast, almost no interaction.
- **Youth (4-7)**: 3 clicks per year. One extra choice vs childhood.
- **Travel team (8-13)**: 2 clicks per year. Same pace as childhood despite being
  on a football team. Six years of 2-click years feels like a long corridor with
  little happening.
- **High school (14-17)**: ~38-41 clicks per year. This is where gameplay starts.
  Each 10-week season has a weekly focus modal, an activities prompt, occasional
  events, and a game day advance. About 23-25 meaningful choices per season.
- **College (18-21)**: ~38-47 clicks per year. Slightly more than HS due to
  12-week seasons and more frequent events. Choice count grows each year (24 to 28)
  suggesting more events trigger as stats increase.
- **NFL (22+)**: Blocked by bug. Expected to be ~50-55 clicks per 17-week season.
- **Pre-football years (0-13) total**: 30 clicks across 14 years.
- **Football years (14-21) total**: ~333 clicks across 8 years.
- **Ratio**: Football seasons require 11x more interaction per year than pre-football.
  The jump from age 13 (2 clicks) to age 14 (38 clicks) is abrupt.

## Game-breaking bugs

### NFL season crashes on week advance

- **Severity**: Blocks all NFL gameplay
- **Error**: `Cannot advance: 6 unfinished game(s) in week 1`
- **Source**: `src/season/season_model.ts:75` in `advanceWeek()`
- **Cause**: The new season layer (`weekly_engine.ts`) calls `advanceWeek()` before
  simulating non-player games for the current week. The `LeagueSeason` model requires
  all games to be finalized before advancing, but only the player's game gets played.
- **Impact**: NFL career is completely unplayable. The game throws 96 console errors
  and the player is stuck at week 1 forever. The "Game Day" / "Next Week" button
  keeps firing the same error.
- **Files**: `src/weekly/weekly_engine.ts:51`, `src/season/season_model.ts:68-78`
- **Fix**: Before calling `advanceWeek()`, simulate (auto-resolve) all non-player
  games for the current week, marking them as `'final'`.

## Duplicate content bugs

### "A New Life Begins" section appears twice

- **Where**: Character creation, after clicking "Start New Game"
- **What**: The story log shows "A New Life Begins / What is your name?" twice before
  showing the "A Star is Born" birth narrative.
- **Screenshot**: `game_screenshots/review/03_age0.png`
- **Likely cause**: `startCharacterCreation()` is called twice, or the welcome text
  and birth text both append the same section.

### "Welcome Back" section appears twice on resume

- **Where**: Loading a saved game
- **What**: The story log shows "Welcome Back / Yusuf Trejo, Age 22" duplicated.
- **Screenshot**: `game_screenshots/review/11_mobile_nfl_resume.png`
- **Likely cause**: Similar to above -- the resume path appends the welcome message
  twice.

### "Start New Game" button persists after character creation

- **Where**: Name entry screen
- **What**: After clicking "Start New Game", the name inputs and "Begin Your Journey"
  button appear but the original "Start New Game" button remains visible below them,
  creating three buttons (Random Name, Begin Your Journey, Start New Game).
- **Screenshot**: `game_screenshots/review/02_name_entry.png`
- **Fix**: Hide or remove the "Start New Game" button when showing name input fields.

## UX and display issues

### Health drops to zero and stays there

- **Where**: NFL season (and likely late college)
- **What**: Health stat shows 0 for the NFL player. The "Train" focus option costs HP
  every week, and the autoplay always picks it, but there is no guardrail preventing
  health from hitting zero. A real player might do the same if they don't understand
  the trade-off.
- **Screenshot**: `game_screenshots/review/12_mobile_stats.png` (HP = 0)
- **Suggestion**: Consider a warning when health is critically low, or prevent
  training when health is below a threshold, or make the cost clearer in the button
  label (currently "TEC up, HP down" -- how much down?).

### Weekly focus button labels inconsistent with stat tab

- **Where**: Weekly Focus modal
- **What**: Focus buttons show abbreviated stat names like "TEC up, HP down" and
  "POP/CONF up, DISC down" but the Stats tab uses full names (Technique, Health,
  Popularity, Confidence, Discipline). The abbreviations are inconsistent -- "CONF"
  could mean Conference or Confidence. "LEAD" for leadership is not shown on the
  stats tab at all.
- **Screenshot**: `game_screenshots/review/06_hs_midseason.png`
- **Suggestion**: Use full stat names in focus buttons, or at least consistent
  abbreviations that match the stat bar labels.

### Team tab is nearly empty in NFL

- **Where**: Team tab during NFL season
- **What**: Shows only the team name and record (e.g. "Cincinnati Bengals (4-7)")
  with no standings, schedule, or roster information. The entire tab is blank below
  the team name.
- **Screenshot**: `game_screenshots/review/13_mobile_team.png`
- **Suggestion**: Show conference standings and the weekly schedule like in HS/college.

### Career tab shows $0 earnings despite playing a season

- **Where**: Career tab after completing college (4 years) and entering NFL
- **What**: "Career Earnings: $0" even though the player had NIL deals in college.
  College earnings may not be tracked, or they reset on phase transition.
- **Screenshot**: `game_screenshots/review/14_mobile_career.png`

### "No team record yet" persists into gameplay

- **Where**: Week card at the top of the Life tab
- **What**: The record card shows "No team record yet. / No upcoming opponent." even
  after the season has started and games have been played. It should show the current
  record and next opponent.
- **Screenshots**: `game_screenshots/review/11_mobile_nfl_resume.png`,
  `game_screenshots/review/09_nfl_midseason.png`

### Week card shows wrong week after resume

- **Where**: NFL resume after save/load
- **What**: Header says "Week 1" but the story log shows weeks 4-11 of gameplay have
  already occurred. The internal week counter resets on reload but the story
  persists.
- **Screenshot**: `game_screenshots/review/09_nfl_midseason.png`

### Old story text not cleared between seasons

- **Where**: Transitioning from college to NFL, and between NFL seasons
- **What**: The story log accumulates text from previous phases. When entering NFL,
  old college week entries are still visible (collapsed). While the collapsing helps,
  the log gets very long over a career.
- **Suggestion**: Clear or archive story text when starting a new phase. Keep only
  the transition narrative.

## Sidebar issues (desktop/iPad)

### THIS WEEK checklist shows unchecked boxes at wrong times

- **Where**: Sidebar "THIS WEEK" section on desktop
- **What**: Shows "Choose focus", "Activity: upcoming", "Event: pending", "Game Day"
  as a checklist, but during childhood and youth phases there is no weekly focus or
  game day. The checklist should only appear during football season phases (HS,
  college, NFL).
- **Screenshot**: `game_screenshots/review/03_age0.png`

### Sidebar shows stale data

- **Where**: Sidebar on desktop
- **What**: The "SEASON and CAREER" section shows "Stars: 0-star (-----)" at age 14,
  which is accurate but unhelpful. After playing games, the stars update, but the
  initial display gives no useful information.
- **Screenshot**: `game_screenshots/review/04_age14_hs_start.png`

## Autoplay script observations

### Repetitive gameplay loop

- **Observation**: Every week follows the exact same 3-click pattern: Weekly Focus
  modal -> Activities modal -> Next Week button. With no event, this becomes
  mechanical very quickly. Events add variety but only trigger ~30-35% of weeks.
- **Suggestion**: Consider varying the weekly rhythm occasionally -- bye weeks, team
  meetings, special events that break the pattern.

### Activities choice is almost always skipped

- **Observation**: The activities prompt ("Pick an activity or skip to game day") adds
  a click to every single week but offers minimal strategic depth. The effects are
  small (+2-3 stats) and the player has to choose between an extra tab visit or
  skipping.
- **Suggestion**: Consider making activities a side-panel choice rather than a modal
  interrupt, or combine it with the weekly focus selection.

### No visual feedback for game results

- **Observation**: After a game, the result appears as story text but there is no
  score animation, highlight play, or visual celebration for wins. The game result
  is easy to miss in the scrolling story log.
- **Suggestion**: Show game result in a brief modal or card with the score prominently
  displayed before returning to the story log.
