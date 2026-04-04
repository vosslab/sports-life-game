BitLife is a text-based life simulator by Candywriter where choices accumulate year by year and shape careers, relationships, crime, health, and endings. It is still actively updated as of March 23, 2026 on Google Play.

Draft spec file: BitLife

Title: BitLife
Genre: Text-based life simulation
Developer: Candywriter, LLC
Platforms: Mobile, with current public listings on the App Store and Google Play.

1. Core game loop

The player starts a randomly generated life at birth and advances mostly one year at a time. Each year presents events, choices, and stat changes. The game describes itself as a "text-based life simulator" where choices "stack up, year after year," and where education, careers, and relationships shape the story and ending.

2. Life-stage simulation

BitLife simulates life as age-gated menus and event pools rather than as a continuous world simulation. Childhood emphasizes family, school, behavior, and early traits. Later stages unlock more systems such as romance, jobs, crime, fame, politics, business, and special themed content. This design is visible in the update history, where new stage-specific systems were added over time, including School, Fame, Politics, Social Media, Business, and later themed features like Vampire Mode and seasonal events.

3. Outcome model: good and bad outcomes

BitLife appears to use a mix of player choice, character stats, and random events. Public descriptions say every decision changes the player's path and that choices produce fallout and consequences. Community documentation also states that higher stat values make a character "live longer and more successfully." In practice, this means good outcomes are more likely when the player maintains strong stats and makes low-risk choices, while bad outcomes become more likely with low stats, risky behavior, crime, illness, and unlucky random events.

4. Likelihood of good or bad outcomes

There does not appear to be any official public source with exact probabilities for most outcomes. So a precise odds table would be speculative. The safest spec language is:
* outcomes are weighted, not purely random
* the weights are influenced by current stats, age, life context, and selected actions
* some events are deterministic unlocks or consequences
* many others are probabilistic, with hidden thresholds or rolls

A reasonable external reading is that BitLife uses a "soft simulation" model: it gives the player directional control, but preserves unpredictability by keeping many odds hidden.

5. Personal stats system

BitLife publicly exposes four main stat bars: Health, Happiness, Smarts, and Looks. Those stats are randomized at the start, can drift as the player ages, and can rise or fall in response to actions and events. The public wiki also notes that extra bars can appear in specific systems, such as Fame after the Fame update and Approval after the Politics update.

6. How personal stats are tracked

The game keeps stats as persistent per-character values that are updated on each age-up and after relevant actions. Public descriptions indicate that they are always visible as bars under the character profile, and that aging itself can nudge them up or down. Since the game is text-based, these stats function as the main compact state layer for the simulation. Other persistent state also seems to include age, family links, education, job history, relationships, criminal record, money/assets, and special mode-specific variables. The app also supports Game Center achievements and leaderboards, which suggests an additional layer of account-level progression outside a single life.

7. Proposed internal spec language for stats

You could describe the system this way:
* CharacterState
* age
* health
* happiness
* smarts
* looks
* optional fame
* optional approval
* wealth/assets
* relationships[]
* education_state
* career_state
* legal_state
* special_mode_flags
* AnnualUpdate()
* increment age
* pull age-appropriate event set
* apply passive stat drift
* resolve player choices
* run consequence checks
* update derived systems such as job status, health conditions, fame, or relationship status

That structure is an inference from the public gameplay model, not an official reverse-engineered schema.

How BitLife has changed over the years

BitLife launched on iOS on September 29, 2018, and the Android version followed on February 4, 2019. The early game was a simpler text life sim, then expanded rapidly through frequent content updates.

Key growth phases look like this:
* 2018 to 2019: core simulator growth, then bigger identity features such as Fame, Prison, and School. Android lagged behind iOS for a period, and the developers explicitly used "Ketchup Updates" to bring Android closer to feature parity.
* 2020: expansion into larger life domains, including Politics, deeper Social Media, and a Pride Update that the developers described as making the game more inclusive around gender and sexuality.
* 2021: a quieter maintenance-heavy period in the update log, with many bug-fix releases and hints that larger plans were in development.
* 2022: a shift toward heavier systems and premium-style content, including the Business Update and restored accessibility features for visually impaired players.
* 2025 to 2026: the game added more event content, marketplace items, streak systems, social features, music/social-media additions like SoundCloud, and fantasy content such as Vampire Mode and follow-on vampire systems. Recent App Store notes also show live seasonal content and monetized marketplace items like the Aura Ring.

Bottom line

BitLife simulates life stages by unlocking age-specific event pools and systems, then modifying outcomes through visible stats plus hidden randomness. Public sources support the general design, but not exact probability values. Over time, BitLife has evolved from a compact text life sim into a much broader platform with specialized career systems, themed modes, events, marketplace items, and frequent live-service style updates.

Status bar
The main status bar tracks the four core character stats: Health, Happiness, Smarts, and Looks. Those values are randomized at the start, drift as you age, and change based on actions and events. Some extra bars can also appear in certain systems, such as Fame.

Profile screen
Clicking the profile shows more detailed information about the character and related people. The profile feature is described as showing more information about your character and their relationships, including stats. Family members, lovers, exes, pets, and school or work contacts also have profile pages.

Sound effects
I could not find a good official Candywriter page listing all audio cues. The best public evidence is an extracted sound archive and the wiki note on notifications. Based on that, BitLife uses short UI and event sounds such as button taps, page flips, dropdown/menu clicks, scenario popups, reward reveals, success stingers, trumpet or bugle cues, and some context-specific sounds for pets, hookups, explosions, and minigames. The wiki also says the notification sound is based on the normal choice-selection sound. This part is best treated as an informed external summary, not an official spec.

Side quests
Not in the usual RPG sense, but BitLife does have side-content systems that work similarly. The clearest examples are Challenges, Scavenger Hunts, Achievements, and Ribbons. Challenges are time-limited global objectives with requirements and rewards. Scavenger Hunts are clue-based seasonal task chains. Achievements are one-time goals, and ribbons are end-of-life awards based on how the character lived.

BitLife is engaging because it compresses an entire life into a fast loop of choices, consequences, and surprise events. The official store description leans hard into that formula: choices stack up year by year, every decision changes your path and ending, and "no two lives, and no two stories, play out the same." That gives players both control and uncertainty at the same time, which is a strong hook.

It is fun to replay because each run is short enough to experiment with, but broad enough to support very different goals. In one life you can try to be a model citizen, in another you can chase fame, crime, wealth, or chaos. The game keeps that replay loop fresh by tying outcomes to both choices and evolving stats, so a new run is not just the same script with different text.

Each instance varies in a few main ways. Your starting conditions are different, including randomized core stats such as Health, Happiness, Smarts, and Looks. Those stats drift over time, and higher values tend to support better outcomes. On top of that, the game keeps feeding age-specific events, relationships, school and career options, and random setbacks or lucky breaks, so the same general strategy can still produce different stories.

A big part of the appeal is that BitLife is simple to read but wide in possibility space. It is text-based, so it moves quickly, but it still simulates enough of adult life, relationships, careers, and consequences to make each run feel like a tiny alternate biography. That combination of speed, branching outcomes, and dark humor is probably the clearest reason people keep starting over.

For your spec, I would summarize it like this:
* Core engagement: fast life-story generation through repeated meaningful choices
* Replay value: short runs, many goals, hidden outcome variance
* Run-to-run variation: randomized starting stats, different event rolls, changing relationships and opportunities
* Player fantasy: test "what if" lives with low friction and high consequence density

BitLife UX/UI Product Specification

1. Overview

BitLife is a text-based life simulation game built around a yearly progression loop. The interface prioritizes clarity, speed, and low cognitive load. The UX enables rapid decision-making while maintaining narrative immersion.

2. Core UX Principles
* Simplicity: Text-first interface with minimal visual clutter
* Speed: One-tap progression through life stages
* Clarity: All key information visible without navigation depth
* Feedback: Immediate response to user actions
* Replayability: Fast reset and low friction to start new lives

3. Primary Navigation Structure

Top-Level Tabs (Persistent Navigation):
* Life (main timeline)
* Relationships
* Activities
* Assets
* Career / School
* Menu / Settings

Each tab exposes context-specific actions relevant to current age and status.

4. Main Life Screen (Core Interface)

Components:

A. Header
* Character name
* Age
* Location (optional depending on build)

B. Status Bar
* Health
* Happiness
* Smarts
* Looks
* Conditional stats:
* Fame
* Approval
* Other mode-specific stats

Behavior:
* Displayed as horizontal bars
* Updated after every action and age increment
* Color-coded for quick interpretation

C. Event Feed (Central Panel)
* Chronological list of life events
* Includes:
* Narrative text
* Outcome summaries
* Random events
* Scrollable

Interaction:
* Passive reading
* No branching from past events

D. Action Panel
* Contextual buttons based on age and state
* Examples:
* Study harder
* Spend time with family
* Go to doctor
* Commit crime

Behavior:
* Updates dynamically each year
* Some actions gated by age, stats, or prior choices

E. Primary CTA
* "Age Up" button
* Advances simulation by one year

5. Profile Screen

Access: Tap character name or avatar

Displays:
* Full stat breakdown
* Personal details:
* Age
* Gender
* Location
* Traits (if present)
* Summary of life state

Extended Profiles:
* Accessible for:
* Family members
* Partners
* Friends
* Pets

Relationship UI:
* List format
* Each entry clickable for interaction options

6. Relationship Interface

Structure:
* Categorized lists:
* Family
* Friends
* Romantic partners
* Children

Per-Entity Data:
* Name
* Relationship type
* Relationship strength (hidden or visible meter)

Actions:
* Spend time
* Argue
* Gift
* Break up
* Other context-specific actions

7. Activities Interface

Purpose:
Central hub for optional actions

Categories:
* Health
* Mind and body
* Crime
* Social
* Entertainment

Behavior:
* Actions affect stats and trigger events
* Some actions have probabilistic outcomes

8. Feedback Systems

Immediate Feedback:
* Event text after every action
* Stat bar changes

Audio Feedback:
* Tap/click sounds
* Event confirmation sounds
* Reward or success tones

Visual Feedback:
* Stat bar movement
* Pop-up modals for major events

9. Progression Model (UX Layer)

Time System:
* Discrete yearly increments

Unlock Logic:
* Age-gated content
* Stat-dependent opportunities
* Career and education branching

User Perception:
* Continuous forward momentum
* Clear cause and effect

10. Replay UX Design

Restart Flow:
* Immediate new life option after death
* Minimal setup time

Variation Sources (UX-visible):
* Randomized starting stats
* Different family structures
* Event variability
* Diverging opportunity sets

Retention Mechanisms:
* Achievements
* Ribbons (end-of-life summary)
* Challenges (time-limited goals)

11. Side Systems (Optional UX Layers)

Challenges
* Visible checklist UI
* Time-limited objectives

Scavenger Hunts
* Clue-based progression
* Cross-life exploration

Achievements
* Persistent across lives
* Tracked in profile/menu

12. Error Prevention and Constraints
* Disabled actions when requirements are unmet
* Clear feedback for failed attempts
* Soft penalties instead of hard blocks

13. Accessibility Considerations
* Text-first design supports readability
* Large tap targets
* Minimal reliance on timing or precision
* Screen reader support (added in later updates)

14. UX Summary

The interface is built around a tight loop:

1. Read event

2. Choose action

3. Observe outcome

4. Age up

This loop is optimized for speed, clarity, and variability. The system balances user control with unpredictable outcomes, which sustains engagement across repeated playthroughs.

Candywriter is a mobile game development studio based in the United States. It created and publishes BitLife, which is its flagship product. The company has been active since around 2014 and focuses mainly on casual, text-based, and simulation-style mobile games.

It was founded earlier, in 2006, and later acquired by the gaming group Stillfront, which owns many mobile studios.

What Candywriter does
* Develops mobile games, mostly free-to-play
* Focuses on simple UI, fast gameplay loops, and high replay value
* Known for text-based and simulation formats, especially BitLife

BitLife is by far its most successful title, with tens of millions of downloads and strong ongoing updates.

Other games like BitLife

Candywriter does have a few direct spinoffs and similar simulation games:

1. DogLife (BitLife Dogs)
* Life simulator where you play as a dog
* Same structure: age up, make choices, relationships, survival

2. CatLife (BitLife Cats)
* Same concept but from a cat's perspective
* Focus on survival, owners, environment, behavior

3. BitLife GO!
* A newer variation or extension of the BitLife concept
* Still centered on life simulation mechanics

These are the closest "BitLife-like" games in their portfolio.

Other (non-BitLife) games

Before BitLife, Candywriter mainly made casual puzzle and word games, such as:
* Letter Soup
* Letter Fridge
* Word Therapy
* What's the Difference

These are simpler, traditional mobile games and not life simulators.

Key takeaway
* Candywriter is essentially a mobile casual game studio
* BitLife is their breakout hit and core product
* Most newer games are variations on the BitLife formula
* Earlier work was puzzle and word-based, not simulation

