# College Football Recruiting for a BitLife-Style Text Simulation

## Purpose

This document translates the real college football recruiting process into a gameable system for a BitLife-style text simulation. The goal is not to perfectly reproduce every NCAA bylaw. The goal is to capture the *feel* of recruiting: early promise, uneven exposure, academic pressure, camp season, coach communication, official visits, committable versus non-committable offers, late risers, decommitments, signing, and the chaos created by coaching changes and the transfer portal.

The best design choice is to build a **layered simulation**:

1. **Reality layer**: a simplified model of how football recruiting works in real life.
2. **Game layer**: systems that generate dramatic choices, uncertainty, and replayability.
3. **Text layer**: short event prompts, coach messages, headlines, and decision popups.

This keeps the simulation believable without turning it into a compliance spreadsheet.

---

## 1. Real-World Recruiting, Reduced to the Core Loop

In real life, football recruiting is a multi-year process driven by six big inputs:

1. **On-field performance**
2. **Physical profile and position fit**
3. **Academic eligibility**
4. **Exposure** through varsity reps, camps, combines, film, and social media
5. **Relationship building** with coaches
6. **Timing** based on recruiting calendars, visit windows, offer timing, and signing rules

A realistic game loop should reflect this pattern:

**Develop -> Get seen -> Get evaluated -> Build relationships -> Receive offers -> Visit -> Commit -> Sign**

That loop should run from roughly freshman year through senior year, with JUCO, prep school, walk-on, and transfer-portal paths as fallback or alternate branches.

---

## 2. What Matters Most in Real Recruiting

### 2.1 Talent alone is not enough

A strong player can still go unrecruited if exposure is poor, film is weak, grades are bad, or the player targets the wrong schools.

### 2.2 Position matters more than generic star power

Recruiting is position-specific. A school may love a player, but if it already has two quarterbacks committed, that school may cool off. This means the game should simulate **roster need** separately from raw interest.

### 2.3 Recruiting is market-based, not purely merit-based

Offers do not come only from the "best" schools. They come from schools where the player fits the program's:

- scheme
- level
- academic threshold
- geographic footprint
- roster need
- budget and scholarship strategy

### 2.4 Timing creates drama

Real recruiting changes based on recruiting periods, visit seasons, midseason film updates, camp performance, early commitments, late risers, coaching turnover, and transfer-portal pressure. The calendar should therefore be one of the main engines of the sim.

### 2.5 Modern recruiting is now dual-track

A modern recruit competes not only against other high school players, but also against transfers. That means a late high school recruit may lose a spot to a portal player, and a committed player may get processed out after a coaching change.

---

## 3. Reality Anchors Worth Preserving

Use these as realism anchors, then simplify from there.

- NCAA recruiting calendars define **contact**, **evaluation**, **quiet**, and **dead** periods. In the 2025-26 FBS calendar, the year cycles through those phases rather than allowing unrestricted contact all year.[^1]
- In Division I football, electronic recruiting correspondence generally cannot begin until **September 1 of junior year**, while phone calls generally cannot begin until **June 15 after sophomore year**, with football-specific exceptions and later restrictions on some calls.[^2]
- NCAA defines an **official visit** as one paid for by the school, while an **unofficial visit** is paid for by the athlete or family.[^3]
- NCAA academic eligibility still matters. Division I requires 16 approved core courses and at least a **2.3 core GPA**; Division II requires 16 core courses and at least a **2.2 core GPA**.[^4][^5]
- Starting with the 2024-25 academic year, high school seniors signing with NCAA Division I or II schools sign an **athletics aid agreement** rather than a separate National Letter of Intent. Once signed, other NCAA schools generally must stop recruiting that player.[^6][^7]
- The transfer portal now materially affects roster management, and NCAA football transfer windows were tightened in 2024, which increased pressure on coaches to manage high school and portal recruiting together.[^8]

For gameplay, the right move is to **keep these facts as invisible rules under the hood**, while exposing only the parts that produce meaningful player choices.

---

## 4. Design Goal for a BitLife-Style Version

A BitLife-style game is choice-driven, text-forward, and highly compressed. That means you should **not** simulate every coach, every camp rep, or every NCAA technicality. Instead, simulate the *decision pressure*.

The player should repeatedly answer questions like:

- Do I focus on grades or training this semester?
- Do I attend a local camp or save money for a major showcase?
- Do I post my film now or wait for better tape?
- Do I commit early to a smaller school or gamble on bigger offers?
- Do I stay loyal after the position coach leaves?
- Do I sign now or keep recruiting open?
- Do I accept preferred walk-on status, go JUCO, or give up football?

If those choices are hard and the outcomes feel plausible, the system will work.

---

## 5. Core Simulation Model

## 5.1 Player attributes

The recruit should have persistent stats split into football, academic, social, and personality dimensions.

### Football attributes

- Position
- Overall rating
- Position skill rating
- Athleticism
- Speed
- Strength
- Agility
- Football IQ
- Versatility
- Development rate
- Injury proneness
- Clutch / big-game trait

### Physical profile

- Height
- Weight
- Frame potential
- Late growth flag
- Body-type fit by position

### Academic attributes

- GPA
- Test prep / academic readiness
- NCAA core progress
- Study habits
- Eligibility risk

### Recruiting attributes

- Exposure
- Film quality
- Camp reputation
- Social media presence
- Coach relationships
- Region reputation
- Star rating
- Recruiting buzz

### Personality / behavior

- Work ethic
- Coachability
- Ego
- Patience
- Loyalty
- Maturity
- Media savvy
- Risk tolerance

These should move independently. A player can be talented but disorganized. A player can be undersized but disciplined and academically strong.

---

## 5.2 School attributes

Each school should have:

- Division / tier: P4, G5, FCS, D2, D3, NAIA, JUCO
- Prestige
- Academics
- NIL strength
- Facilities
- TV exposure
- Conference strength
- Distance from home
- Coach reputation
- Coach stability
- Scheme fit by position
- Depth chart need by position
- Scholarship budget model
- Admissions difficulty
- Playing-time opportunity
- Preferred pipelines by region
- Recruiting aggression
- Portal preference, high school preference, or balanced strategy

The most important hidden stat is **Need x Fit x Interest**.

A lower-prestige school with urgent linebacker need should recruit a player harder than a blueblood with no room.

---

## 5.3 Coach attributes

Recruiting should be school-wide but personality-driven through coaches.

Each school can have:

- Head coach
- Recruiting coordinator
- Position coach

Coach traits:

- Honest or misleading
- Loyal or volatile
- Relationship builder or transactional
- Evaluates traits well or poorly
- Pushes early commitments or slow-plays recruits
- Development-focused or star-chaser

This allows flavorful events:

- "Coach Rivera says you are their top safety target."
- "The staff keeps calling, but they will not discuss whether the offer is committable."
- "Your position coach left for a rival school."

---

## 6. Recommended Time Structure

Use **semester turns** plus **event bursts**.

### Base turn rhythm

- Fall semester
- Spring semester
- Summer recruiting season

### Event bursts inside each turn

- Game performance events
- Injury events
- Coach contact events
- Camp/combine events
- Social media events
- Visit events
- Academic checkpoint events

This gives enough granularity for recruiting momentum without forcing dozens of clicks per year.

---

## 7. High School Recruiting Timeline as Game Progression

## Freshman year

Main fantasy: promise and uncertainty.

Systems to emphasize:

- build baseline ratings
- JV versus varsity battle
- early social profile creation
- first camp opportunities
- first highlight clips
- first injuries and grade risk

What schools do:

- almost no direct recruiting
- generic camp interest only
- early watchlist flags for elite players

Best game use:

- establish archetype
- seed sleeper or phenom paths

### Suggested freshman events

- "Your high school coach says you could play varsity next year if you add 15 pounds."
- "A local trainer offers discounted speed sessions."
- "You can either attend a regional camp or spend the summer in the weight room."

## Sophomore year

Main fantasy: first real exposure.

Systems to emphasize:

- first meaningful varsity tape
- social posting choices
- early outbound emails to programs
- camp and combine strategy
- academics start to matter more

What schools do:

- limited direct communication depending on rules and level
- more passive evaluations
- internal watchlists begin to form

Best game use:

- create the first real divergence between hidden upside and public reputation

### Suggested sophomore events

- "Your highlight reel gets 2,300 views after your quarterback tags you on X."
- "A small FCS staff member likes your post but does not message you."
- "Your counselor warns you that your core GPA is drifting toward the danger zone."

## Junior year

Main fantasy: recruiting explodes.

This is the most important year in the sim.

Systems to emphasize:

- legal coach communication opens up by rule and date
- unofficial visits
- camp invites
- first offers
- ranking bumps and drops
- media attention
- coach relationships deepen
- eligibility center registration

What schools do:

- set board tiers: primary target, backup target, camp evaluation, no-fit
- hand out committable and non-committable offers
- adjust interest based on camp results and senior projection

Best game use:

- tension between prestige, fit, patience, and security

### Suggested junior events

- "A Power Four assistant texts: 'Love your upside. Need to see you in person this spring.'"
- "You run a disappointing forty at a regional combine. Your buzz drops."
- "A Group of Five school offers, but your coach says it might not be committable yet."
- "Your GPA rises above the school's admissions floor and two programs re-enter the race."

## Senior year

Main fantasy: decision season.

Systems to emphasize:

- official visits
- in-home visits if modeled abstractly
- final senior tape
- commitment pressure
- recruiting flips
- coaching changes
- signing
- walk-on or JUCO fallbacks

What schools do:

- close on top targets
- reshuffle boards when recruits commit elsewhere
- pull non-committable offers
- replace HS targets with portal players late in the cycle

Best game use:

- heavy drama and irreversible choices

### Suggested senior events

- "A school you liked now wants an answer before your rival visit next weekend."
- "The head coach who recruited you took another job. Stay committed?"
- "A transfer quarterback entered the portal, and your scholarship slot may be reallocated."
- "You can sign your athletics aid agreement now or hold out for one last official visit."

## Post-high school branch

Possible outcomes:

- sign scholarship
- sign and redshirt
- preferred walk-on
- unrecruited walk-on tryout path
- JUCO
- prep school / reclass path
- quit football

This branch is important because failure paths make success feel earned.

---

## 8. The Recruit Rating System

A strong design uses **three different values** rather than one number.

### 1. True talent
Hidden to player.

Represents real future college value.

### 2. Public reputation
Visible or semi-visible.

Represents stars, buzz, media hype, and social proof.

### 3. Recruitability
Hidden or partially visible.

Represents how likely schools are to actually pursue the player now.

Formula example:

```text
Recruitability =
  (True Talent x 0.35)
+ (Position Fit x 0.15)
+ (Physical Threshold Match x 0.15)
+ (Film Quality x 0.10)
+ (Exposure x 0.10)
+ (Academics x 0.10)
+ (Coach Relationship x 0.10)
- (Injury Risk x 0.05)
- (Character Flags x 0.05)
```

This separation produces realistic stories:

- a high-talent rural player with poor exposure
- an overhyped social media player with weak fundamentals
- a late bloomer who grows three inches and surges
- a solid player whose grades block offers

---

## 9. Offer System Design

Offers should not be binary. Use at least five states.

1. **Watchlist**
2. **Interest**
3. **Soft offer / invite to keep talking**
4. **Verbal scholarship offer**
5. **Committable offer**
6. **Signed athletics aid agreement**

You may also want:

- preferred walk-on offer
- invited to camp for re-evaluation
- greyshirt / delayed enrollment offer
- roster spot without aid

### Committable versus non-committable

This is a major source of drama and should absolutely be in the game.

A school can show public interest without guaranteeing a spot. In the sim, every offer should carry hidden fields:

- `is_committable`
- `expires_on`
- `priority_rank`
- `position_room_remaining`
- `aid_amount`
- `staff_confidence`

So the player might see:

- **"Offer: Coastal State"**
- *Status: Verbal offer*
- *Coach tone: Warm*
- *Commitment security: Unclear*

That uncertainty is good gameplay.

### Offer score formula

```text
SchoolOfferChance =
  BoardPriority
  x PositionNeed
  x SchemeFit
  x AcademicAdmissibility
  x Recruitability
  x RegionalPipelineBonus
  x RelationshipStrength
  x TimingModifier
  x StaffStabilityModifier
  x ScholarshipAvailability
```

---

## 10. School AI and Recruiting Boards

Each school should maintain a board by position.

For each position group:

- target slots needed
- primary targets
- secondary targets
- fallback targets
- portal alternatives
- local sleepers

### Example

A school needs 2 linebackers.

It may track:

- 3 blue-chip primaries
- 5 realistic second-tier targets
- 4 fallback options
- 2 portal contingencies

Behavior logic:

- if primary commits elsewhere, increase pressure on second-tier targets
- if portal linebacker appears, reduce HS pressure
- if coach gets hot seat status, shorten timeline and push quicker commits

This makes the ecosystem feel alive.

---

## 11. Academics and Eligibility

Academics should not be cosmetic. They should gate offers, admissions, and signing.

### Minimum academic systems

- GPA
- core GPA progress
- test readiness or admissions profile
- school-specific academic threshold
- NCAA eligibility status

### Suggested statuses

- Fully eligible
- Borderline
- Needs core courses
- Test score concern
- Admissions risk
- Ineligible for NCAA path

### Important design note

Do not force users to micromanage exact core-course accounting. Instead, convert this into a clean game meter:

- **Core Progress**: Behind / On Track / Strong
- **Academic Standing**: At Risk / Solid / Excellent

That keeps the system legible while still reflecting that NCAA eligibility can block opportunities.[^4][^5]

### Good academic event prompts

- "Your algebra grade slipped from a B to a D. Your coach warns that college staffs notice transcripts."
- "A tutor can help recover your GPA, but it will reduce training time this semester."
- "An admissions-heavy school loves your tape, but wants your grades to improve before offering."

---

## 12. Exposure Systems

Exposure is one of the most important variables because it explains why equally talented players get different results.

### Exposure sources

- varsity snaps
- playoffs
- local media
- all-district or all-state honors
- camp attendance
- combine testing
- seven-on-seven or showcase events
- social media
- coach networking
- private trainers
- school prestige of high school program

### Exposure should be nonlinear

A little exposure helps. Strong exposure compounds.

Example:

- first varsity tape gives modest boost
- viral junior-season clip gives big boost
- camp MVP plus coach follow from same week stacks into major buzz jump

### Exposure can also be misleading

A player may become overexposed and overrated, leading to inflated expectations and disappointment.

That is good drama.

---

## 13. Highlight Film System

Film should be a stand-alone subsystem because it is central to real recruiting.

### Film variables

- footage quality
- play quality
- clip length
- first 15 seconds strength
- position relevance
- update recency
- distribution quality

### Recommended abstraction

Give the player one action per major window:

- build first reel
- update junior reel
- final senior reel

Each reel gets a grade:

- Poor
- Serviceable
- Strong
- Elite

Film grade should depend on:

```text
FilmGrade =
  Best Plays
  + Camera Quality
  + Position Clarity
  + Editing Quality
  + Competition Level
  + Recency
```

### Event examples

- "Your uncle edits your film for free. It looks polished, but half the clips are against weak competition."
- "Your coach refuses to send your tape until you improve your blocking effort."
- "A clip of your pick-six goes semi-viral and doubles your profile traffic."

---

## 14. Camps, Combines, and Showcases

This should be one of the strongest growth-versus-exposure tradeoff systems in the game.

### Event types

- local camp
- college prospect camp
- elite regional showcase
- national combine
- private trainer showcase

### What camps can change

- verified testing numbers
- school-specific relationships
- rankings
- offer probability
- confidence or morale
- injury risk
- money spent

### Design principle

Different camps should serve different purposes:

- **local camp**: cheap, low exposure, small skill gains
- **college camp**: direct access to one staff, best for borderline targets
- **regional showcase**: broad exposure, strong rating movement
- **elite national event**: big reputation swing, expensive, high volatility

### Camp outcome model

```text
CampPerformance =
  Athleticism
  + PositionSkill
  + Confidence
  + Conditioning
  - InjuryPenalty
  - PressurePenalty
  + RandomVariance
```

A big camp win should create genuine acceleration. A poor testing day should hurt, but not destroy, a high-talent player.

---

## 15. Social Media and Personal Brand

This belongs in a modern version because it now functions as a recruiting amplifier.

### Social stats

- followers
- professionalism
- post consistency
- controversy risk
- coach engagement rate

### Possible player actions

- post highlights
- share workout clips
- post grades and awards
- message coaches
- argue online
- post something immature
- hire someone to run account

### Outcomes

- increased exposure
- coach follows
- camp invites
- media buzz
- character concerns
- suspended by coach or school

This is a perfect BitLife-style event engine.

### Example prompts

- "Your workout video hits 40,000 views after a local reporter reposts it."
- "You subtweeted your offensive coordinator. Two coaches unfollowed you."
- "A recruiter DM'd asking for updated film and transcript info. Reply now?"

---

## 16. Visits System

Visits should be where recruiting becomes emotional.

### Unofficial visits

- lower cost to school
- player or family pays
- can happen earlier
- useful for interest building

### Official visits

- school-funded
- more persuasive
- often closer to commitment decisions

The sim should not drown in visit logistics. Instead, each visit should produce scores in:

- relationship bump
- campus vibe
- NIL impression
- playing time confidence
- academic comfort
- family approval
- honesty of staff

### Visit outcome card

After a visit, give the player a summary like:

- **Campus vibe:** Great
- **Coach trust:** Medium
- **Path to early playing time:** Strong
- **Team culture:** Poor
- **Distance from home:** Tough
- **Family reaction:** Positive

That supports later commitment decisions.

---

## 17. Commitment and Signing

Modernize this section.

In an NCAA-based modern sim, the final legal step should be represented as a **signed athletics aid agreement**, not a separate NLI, because NCAA Division I and II moved away from the stand-alone NLI document for seniors starting with 2024-25.[^6][^7]

### Commitment states

- Leaning
- Silent commit
- Public verbal commit
- Locked commit
- Signed aid agreement

### Decommitment triggers

- head coach left
- position coach left
- NIL package changed
- depth chart worsened
- late offer from dream school
- academics cleared unexpectedly
- family pressure
- rumor of being processed out

### Signing tension

Before signing, show:

- scholarship value
- expected role
- redshirt chance
- transfer-portal competition risk
- coach stability
- academic fit
- home distance

### Example prompt

> You are verbally committed to Great Lakes University, but a late official visit to Sun Belt Tech went better than expected. Great Lakes wants your signature this week. What do you do?

Choices:

- Sign now
- Stall and visit
- Decommit publicly
- Ask for more aid

---

## 18. Modern Complication: The Transfer Portal

A current-feeling sim should include the transfer portal as a pressure source even if the player is still in high school.

### Why it matters

Coaches now choose between:

- high school recruit with upside
- transfer with proven college film

That should affect recruiting late in the cycle.

### Suggested implementation

Each school gets a hidden strategy slider:

- HS-heavy
- balanced
- portal-heavy

Late-cycle logic:

- portal-heavy schools reduce high school offers if similar transfers appear
- unstable staffs shift toward older players who can help immediately
- rebuilding staffs may still take more freshmen for development

### Text events

- "A veteran corner entered the portal. Your top school cooled on your recruitment."
- "A school tells you they still want you, but only as a developmental take."
- "After spring portal movement, two programs circle back to you as a fallback option."

---

## 19. Injuries, Growth, and Late Bloomers

These systems are essential for replay value.

### Injuries

Should affect:

- season production
- camp attendance
- speed metrics
- coach trust
- long-term projection

### Growth spurts

Especially important for positions like QB, TE, DE, OT, LB.

Possible outcomes:

- late growth unlocks new division level
- bad weight gain reduces speed and fit
- frame projection raises recruiting ceiling before production catches up

### Late bloomer flag

Some players should have hidden late-bloomer status, causing:

- slow early ratings
- strong junior or senior leap
- more volatile final recruiting outcome

This creates believable sleeper stories.

---

## 20. Stars, Rankings, and Public Perception

Do not let stars fully control offers. Use them as social proof.

### Suggested star system

- 2-star: local or lower-level recruit
- 3-star: solid college prospect
- 4-star: high-level national recruit
- 5-star: elite blue-chip recruit

### What stars should affect

- media coverage
- coach aggression
- visit invite rate
- NIL attention
- ego events

### What stars should *not* fully determine

- scheme fit
- coach honesty
- development outcomes
- actual future success

This allows great long-term stories, such as an overlooked 2-star becoming an NFL draft pick later in the career sim.

---

## 21. Recommended Player Decision Set

On each turn, let the player choose 1 to 3 focus actions.

### Development actions

- lift weights
- speed training
- position drills
- film study
- recover from injury

### Academic actions

- tutoring
- extra study time
- retake exam prep
- meet counselor

### Exposure actions

- attend camp
- message coaches
- update highlight film
- post on social media
- visit a school

### Relationship actions

- call coach
- thank staff after visit
- ask bluntly if offer is committable
- commit early
- reopen recruitment

This creates good pressure because the player cannot maximize everything.

---

## 22. Recommended Hidden Variables

These make the world feel alive.

- family budget
- parent pressure
- hometown visibility
- high school coach network quality
- school counselor quality
- staff honesty score
- roster crunch probability
- recruiting class strength at your position
- random local media luck
- weather or travel disruption at major camp
- scandal or coaching hot-seat risk at schools

A coach can love the player and still lose the battle because of unrelated chaos. That is realistic and fun.

---

## 23. Suggested Data Model

```json
{
  "player": {
    "position": "WR",
    "overall": 78,
    "trueTalent": 84,
    "publicRating": 74,
    "heightIn": 72,
    "weightLb": 182,
    "athleticism": 81,
    "footballIQ": 70,
    "versatility": 66,
    "gpa": 3.1,
    "coreProgress": "On Track",
    "filmGrade": "Strong",
    "exposure": 58,
    "socialMedia": 49,
    "workEthic": 77,
    "coachability": 82,
    "injuryRisk": 21,
    "starRating": 3,
    "recruitingBuzz": 61
  },
  "schools": [
    {
      "name": "Great Plains State",
      "tier": "G5",
      "prestige": 68,
      "academics": 61,
      "nil": 54,
      "distance": 220,
      "coachStability": 73,
      "portalStrategy": "balanced",
      "needByPosition": {"WR": 0.87},
      "schemeFitByPosition": {"WR": 0.91},
      "interest": 74,
      "relationship": 63,
      "offerState": "Committable",
      "scholarshipAmount": 1.0,
      "visitStatus": "Official Completed"
    }
  ]
}
```

---

## 24. State Machine for Recruiting

```text
Unknown
-> Scouted
-> Watchlist
-> Contact Allowed
-> Active Recruitment
-> Offer Extended
-> Offer Clarified (committable or not)
-> Visit Stage
-> Verbal Commitment
-> Signed Aid Agreement

Alternative exits:
- Offer Pulled
- Decommitment
- Preferred Walk-On
- JUCO Route
- Recruitment Ends
```

This is enough structure for clear event writing and clean save-state logic.

---

## 25. Event Writing Templates

Because this is a text sim, event writing quality matters as much as system quality.

### Coach message template

> Coach [Name] from [School] says your film "jumps off the screen," but he wants to see your camp numbers before discussing an offer.

### Campus visit template

> The facilities at [School] are impressive, but your future position coach seems distracted and keeps checking his phone during dinner.

### Family pressure template

> Your mom loves the academics at [School], but your dad thinks you are settling too soon.

### Signing drama template

> A reporter posts that you are a lock to sign with [School], but another program just scheduled an in-home visit.

### Offer uncertainty template

> [School] says it is "100% with you," but when you ask whether the spot is guaranteed, the staff dodges the question.

These short prompts can carry an enormous amount of emotion with very little UI.

---

## 26. Balancing Rules for Fun

To keep the mode fun rather than deterministic:

### Rule 1: Never let one stat fully decide recruiting

Real recruiting is multivariable. The game should be too.

### Rule 2: Let underdogs have paths

A player with weak measurables but elite grades and work ethic should still find a viable route.

### Rule 3: Preserve uncertainty

The player should rarely know exactly why a school cooled, only the likely reasons.

### Rule 4: Use reversals

Good systems create stories like:

- injury to scholarship to comeback
- no offers to late senior surge
- big-school commit to decommit after coaching change
- unrecruited player to JUCO to FBS comeback

### Rule 5: Make fit beat prestige often enough

If the best answer is always "pick the highest prestige school," the game gets shallow fast.

---

## 27. Recommended Simplifications

For a BitLife-style game, simplify these aggressively:

### Simplify

- exact NCAA bylaw wording
- exact numbers of staff contacts
- exact official-visit counts
- exact scholarship accounting per roster rule set
- exact admissions paperwork

### Preserve

- contact timing gates
- academic eligibility risk
- official versus unofficial visits
- committable versus non-committable offers
- coaching changes
- transfer-portal competition
- signing choice

That gives realism without bloat.

---

## 28. Best Implementation Blueprint

If building this today, I would use the following structure.

### Phase 1: Foundation

Implement:

- player ratings
- GPA and eligibility
- school database
- recruiting interest score
- offers and visits
- commit and sign flow

### Phase 2: Depth

Add:

- camps and combines
- film system
- social media
- committable offer logic
- coaching changes
- decommitments

### Phase 3: Modern realism

Add:

- portal competition
- NIL influence
- family pressure
- late bloomer system
- region pipelines
- media rankings

---

## 29. Sample Turn Flow

### Summer before junior year

1. Player chooses focus: **Elite showcase**
2. Runs well, performs above expectation
3. Exposure +12, public rating +1 star tier chance
4. Two schools move from Watchlist to Active Recruitment
5. Player updates highlight film
6. One G5 offers, one P4 invites for unofficial visit
7. GPA warning event fires because summer school was skipped

That is a full, believable recruiting story in one turn.

---

## 30. Final Recommendation

To make college football recruiting work in a BitLife-style text sim, build it around **uncertainty, timing, fit, and tradeoffs**, not raw stat checks.

The player should feel that:

- development matters
- grades matter
- exposure matters
- relationships matter
- timing matters
- one bad semester or one huge camp can change everything

The most important design choice is this:

> **Simulate recruiting as a changing market, not a fixed ladder.**

That is what makes the process feel authentically like college football.

---

## Appendix A: Minimal System Checklist

If you want the leanest possible version that still feels right, include these 10 systems:

1. Player skill and physical profile
2. GPA and eligibility gate
3. School fit and roster need
4. Film quality
5. Exposure meter
6. Camp/showcase events
7. Coach relationship meter
8. Offer states, including non-committable
9. Visit system
10. Commitment, decommitment, and signing

That is enough for a strong first version.

---

## Appendix B: Sources and Reality Notes

[^1]: NCAA, 2025-26 Division I Football Bowl Subdivision Recruiting Calendar. The calendar cycles through quiet, dead, evaluation, and contact periods rather than allowing unrestricted in-person recruiting year-round. Source: https://ncaaorg.s3.amazonaws.com/compliance/recruiting/calendar/2025-26/2025-26D1Rec_FBSMFBRecruitingCalendar.pdf

[^2]: NCAA legislative text and recruiting rules. Football-specific contact and communication rules include September 1 of junior year for recruiting materials and electronic correspondence, June 15 after sophomore year for general phone-call timing, and football-specific off-campus contact limits. Source: https://web3.ncaa.org/lsdbi/search/proposalView?id=107091

[^3]: NCAA Recruiting FAQ. Official visits are paid for by the school; unofficial visits are paid for by the athlete or family. Source: https://www.ncaa.org/sports/2021/2/10/recruiting-calendars-faq.aspx

[^4]: NCAA Division I academic standards. Division I requires 16 NCAA-approved core-course credits and at least a 2.3 core GPA. Source: https://fs.ncaa.org/Docs/eligibility_center/Student_Resources/DI_ReqsFactSheet.pdf

[^5]: NCAA Division II academic standards. Division II requires 16 NCAA-approved core-course credits and at least a 2.2 core GPA. Source: https://fs.ncaa.org/Docs/eligibility_center/Student_Resources/DII_ReqsFactSheet.pdf

[^6]: NCAA Eligibility Center materials. Starting with 2024-25, seniors signing with NCAA Division I or II schools sign an athletics aid agreement rather than a separate National Letter of Intent. Source: https://fs.ncaa.org/Docs/eligibility_center/Tutorials/MIPortal.pdf

[^7]: NCAA legislative change, Proposal 2024-55. Once a prospective student-athlete signs a written athletics aid agreement with another NCAA Division I or II institution, contact by other NCAA schools is generally prohibited. Source: https://web3.ncaa.org/lsdbi/reports/pdf/searchPdfView?businessCode=PROPOSAL_SEARCH_VIEW&division=1&id=108200

[^8]: NCAA Division I Council action on football and basketball transfer windows, approved October 9, 2024. Football windows were reduced from a total of 45 days to 30 days, increasing roster-management pressure. Source: https://www.ncaa.org/news/2024/10/9/media-center-di-council-approves-changes-to-notification-of-transfer-windows-in-basketball-football.aspx
