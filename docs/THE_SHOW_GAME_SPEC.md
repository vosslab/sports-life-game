Game Spec: The Show '25

1. Overview

Title: The Show '25
Platform: Console
Genre: Sports, Simulation
Mode: Single-player, Local Multiplayer, Online Multiplayer
Target Audience: Baseball fans, sports sim players, casual console players
Core Fantasy: Let players feel like they are playing, managing, and living a full modern professional baseball season.

2. Product Vision

The Show '25 should deliver an authentic, polished baseball experience with realistic gameplay, strong presentation, deep career and franchise modes, and accessible controls for new players.

3. Core Pillars

Authenticity
Accurate baseball rules, player behavior, stadium atmosphere, broadcast-style presentation.

Responsiveness
Fast controls, low input friction, readable timing systems, smooth fielding and throwing.

Depth
Meaningful player progression, team management, season simulation, roster building.

Accessibility
Optional assists, beginner-friendly hitting and pitching, clear tutorials, scalable difficulty.

4. Core Gameplay Loop

1. Player selects a mode.

2. Player enters a game, season, or career event.

3. Player competes in baseball gameplay.

4. Player earns rewards, stats, and progression.

5. Player upgrades skills, adjusts roster, or advances schedule.

6. Player returns for the next game or long-term objective.

5. Game Modes

Exhibition

Single standalone game with custom teams, stadium, weather, and difficulty.

Season

Play a full season or shortened season with standings, injuries, trades, and playoffs.

Franchise

Control a club across multiple years. Manage roster, budget, scouting, trades, contracts, and development.

Road to the Show

Create one player and progress from prospect to star through performance, training, and narrative events.

Online Head-to-Head

Competitive online matches with ranked and unranked playlists.

Local Multiplayer

Same-console multiplayer for quick play.

6. Core Systems

Batting
* Timing-based swing input
* Contact swing
* Power swing
* Bunt
* Check swing
* PCI-style aiming option
* Assist options for casual users

Batting goals:
Readable pitch recognition, satisfying contact, skill-based outcomes, reduced randomness on well-timed input.

Pitching
* Multiple pitch types
* Timing and accuracy meter
* Pitch confidence and stamina
* Ball and strike count logic
* Wildness under pressure

Pitching goals:
High skill ceiling, clear feedback, realistic control loss with fatigue.

Fielding
* Assisted and manual fielding
* Catch indicators
* Throw meter for accuracy
* Dive and jump actions
* Tag and relay systems

Base Running
* Auto and manual running
* Steal timing
* Lead-off control
* Slide choice
* Tag-up logic

7. Controls

Design Goals
* Easy to learn
* Hard to master
* Consistent across modes
* Minimal input delay

Example Input Map

Batting
* Left Stick: aim / influence swing
* Face Button 1: contact swing
* Face Button 2: power swing
* Face Button 3: bunt
* Shoulder Button: check swing modifier or situational input

Pitching
* Left Stick: aim pitch target
* Face Buttons: choose pitch type
* Trigger: start pitch motion
* Stick or meter input: accuracy execution

Fielding
* Left Stick: move player
* Face Buttons: throw to bases
* Trigger: cutoff / relay
* Shoulder Button: dive / jump

8. Progression

Player Progression
* XP earned from performance
* Attribute upgrades
* Perks and traits
* Position-specific growth paths

Team Progression
* Better scouting results
* Staff upgrades
* Farm system improvement
* Budget and roster efficiency

9. Difficulty and Accessibility
* Rookie, Veteran, All-Star, Hall of Fame, Legend
* Dynamic difficulty option
* Hitting assists
* Pitching assists
* Base running assists
* Fielding assists
* Colorblind-safe UI support
* Subtitle and text scaling support

10. AI Requirements

Gameplay AI
* Pitch selection should reflect count, hitter tendencies, and game situation
* Batters should adapt to repeated pitch patterns
* Fielders should prioritize realistic baseball decisions
* Runners should react to hit type, outs, and arm strength

Simulation AI
* Trade logic must value age, salary, contract length, and team needs
* Lineup decisions must consider fatigue, handedness, and injuries
* Prospect development should vary but remain understandable

11. Presentation

Broadcast Style
* TV-style overlays
* Dynamic commentary
* Replays
* Crowd reactions
* Walk-up moments
* Stat callouts and milestones

Audio
* Stadium ambience
* Bat crack and glove audio with strong feedback
* Commentary variation by context
* Menu music and team-specific atmosphere cues

12. UI/UX

Principles
* Fast navigation
* Clear stat visibility
* Low menu clutter
* Important actions reachable in few inputs

Required Screens
* Main menu
* Team select
* Lineup management
* Rotation and bullpen management
* Player card
* Franchise hub
* Career hub
* Post-game summary
* Settings and accessibility

13. Technical Requirements
* Target 60 FPS gameplay
* Stable online matchmaking
* Fast save and load times
* Minimal transition downtime between innings and menus
* Robust autosave for career and franchise modes

14. Save Data

Store:
* User settings
* Rosters
* Franchise files
* Career files
* Online profile data
* Unlocks and earned rewards

15. Live Service / Post-Launch Support
* Roster updates
* Balance tuning
* Bug fixes
* Limited-time online events
* Seasonal rewards

16. Success Metrics
* High match completion rate
* Strong retention in franchise and career modes
* Positive user feedback on responsiveness
* Reduced frustration in batting and fielding onboarding
* Stable online play and matchmaking

17. Risks
* Overly complex controls for new players
* Frustration from batting difficulty spikes
* AI exploits in pitching and base running
* Franchise depth becoming menu-heavy
* Commentary repetition

18. Out of Scope
* Open-world hub exploration
* Arcade mini-games unrelated to baseball
* Cross-sport features
* Full GM story campaign with cinematic branching

Life Stage Simulation (The Show '25)

1. Career Structure

The career mode models a simplified progression:

1. High School

2. Minor League

3. Major League

Each stage uses performance, scouting rating, and random variation.

2. High School Stage

Purpose: Introduce mechanics and seed player trajectory.

Systems
* Short season format (10 to 25 games)
* Regional competition tiering
* Scout visibility score
* Performance metrics tracked:
* Batting average
* On-base percentage
* ERA (for pitchers)
* Fielding percentage

Outputs
* Draft projection (round range)
* Scholarship offers (optional flavor system)
* Skill baseline for next stage

3. State Championship Simulation

Model
* Tournament bracket (single elimination)
* Team rating = average player rating + chemistry modifier + coach modifier

Win Probability (Simplified)

Let:
* Team rating difference = D

Then:
* Game win probability follows a logistic curve

Typical ranges:
* Even teams: ~50 percent
* Slightly stronger team: 55 to 65 percent
* Strong team: 70 to 85 percent

Championship Odds

Assuming 4 rounds:
* Average team:
~6 to 10 percent chance to win championship
* Strong team (top 10 percent):
~20 to 35 percent
* Dominant team:
~40 to 60 percent

Random variance is intentionally high at this stage.

4. Minor League Stage

Purpose: Development and filtering.

Systems
* Longer season
* Fatigue and consistency modeling
* Attribute growth tied to performance and training

Key Variables
* Consistency rating
* Potential ceiling
* Injury risk
* Coach development bonus

5. Major League Stage

Purpose: Peak gameplay and long-term progression.

Systems
* Full stat tracking
* Contract and reputation systems
* Media and fan interest (light simulation)

Award Systems

1. Player of the Week

Selection Pool
* All active players in league
* Filter by minimum playtime

Scoring Formula (example)

Score =
* Offensive contribution (hits, HR, RBIs)
* Pitching contribution (ERA, strikeouts)
* Clutch modifier
* Team win bonus

Probability

For an average starter:
* ~1 to 3 percent chance per week

For strong performers:
* ~5 to 12 percent

For elite streak:
* ~15 to 25 percent during peak weeks

Distribution is skewed toward high stat output, not pure randomness.

2. Seasonal Awards

Examples:
* MVP
* Cy Young equivalent
* Rookie of the Year

Model

Weighted cumulative stats + narrative modifiers:
* Team success
* Clutch moments
* Consistency

Top candidates:
* Top 3 to 5 percent of players statistically

Randomness vs Skill Balance
* 70 to 85 percent driven by player input and stats
* 15 to 30 percent randomness to simulate real-world variance

What Changes in The Show '26

1. Expanded Life Stages
* Add College Baseball path (optional branch)
* Add Pre-draft showcase events
* Add late-career decline phase

2. More Granular Probabilities
* Hidden traits affect clutch and streaks
* Momentum system impacts short-term performance
* Fatigue has nonlinear effects

3. Dynamic Story Layer
* Rivalries
* Coach relationships
* Media pressure affecting performance

4. Tournament Realism Upgrade
* Regional strength differences
* Seeding logic based on season performance
* Upset probability tuned by pressure variable

5. Awards System Improvements
* Voter simulation instead of pure formula
* Bias factors:
* Market size
* Team success
* Narrative moments

6. Progression Changes
* Skill growth tied to specific in-game actions
* Training mini-systems
* Slumps and hot streak persistence

7. AI Improvements
* Adaptive pitching patterns
* Batter learning model
* Smarter base running decisions

8. Online Integration
* Shared seasonal events
* Weekly challenges tied to real-world stats
* Competitive ladders with rewards
