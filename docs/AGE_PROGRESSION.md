# Age progression

Life progression from age 1 through retirement, organized by age band.

## Age bands

| Ages | Handler | Phase | Football | Season | Depth chart |
| --- | --- | --- | --- | --- | --- |
| 1-7 | kid_years | childhood | No | - | - |
| 8-10 | peewee | youth | Yes | 6 games | No (everyone plays) |
| 11-13 | travel | youth | Yes | 8 games | Starter/backup |
| 14-15 | hs_frosh_soph | high_school | Yes | 10 games + playoffs | Bench/backup/starter |
| 16-17 | hs_varsity | high_school | Yes | 10 games + playoffs | Backup/starter |
| 18 | college_entry | college | Yes (or redshirt) | 12 games | Varies by school |
| 19-20 | college_core | college | Yes | 12 games | Backup/starter |
| 21 | college_senior | college | Yes | 12 games | Starter |
| 22 | nfl_rookie | nfl | Yes | 17 games | Backup/starter |
| 23-26 | nfl_early | nfl | Yes | 17 games | Backup/starter |
| 27-31 | nfl_peak | nfl | Yes | 17 games | Starter |
| 32-36 | nfl_veteran | nfl | Yes | 17 games | Starter/backup |
| 37-39 | nfl_late | nfl | Yes | 17 games | Starter/backup |

## Milestones by age

| Age | Milestone | Description |
| --- | --- | --- |
| 8 | First football | Coach assigns position based on size and athleticism |
| 14 | High school | School name and mascot generated. Position selection. |
| 16 | Driver license | Automatic milestone event. Move to varsity. |
| 17 | Senior year | College offers based on recruiting stars |
| 18 | College entry | Choose from 3 schools. Optional redshirt year. |
| 21 | Graduation | Mandatory draft declaration |
| 22 | NFL draft | Draft round based on draft stock. Assigned to real NFL team. |
| 30+ | Decline begins | Athleticism starts declining |
| 32+ | Retirement option | Voluntary retirement available each offseason |
| 39 | Forced retirement | Career ends at age 39 |

## Team identity persistence

- **Town name and mascot**: generated at age 8, persists through age 13 (peewee and travel)
- **HS name and mascot**: generated at age 14, persists through age 17 (frosh/soph and varsity)
- **College**: chosen at age 17, persists through age 21
- **NFL team**: assigned at draft (age 22), persists unless traded

## Position evolution

- **Age 8**: coach assigns position based on size + athleticism
- **Ages 11-13**: position can shift based on growth spurts (size changes)
- **Age 14**: player chooses position at HS tryouts (coach suggests based on stats)
- **Offseason**: position change available at key transition points
- **NFL**: position change rare, only at offseason with coach approval

### Position assignment rules

| Size | Athleticism | Likely positions |
| --- | --- | --- |
| 4-5 (large) | 60+ | TE |
| 4-5 (large) | 40-59 | DL |
| 4-5 (large) | <40 | OL |
| 3 (medium) | 65+ | QB |
| 3 (medium) | 50-64 | LB |
| 3 (medium) | <50 | S |
| 1-2 (small) | 65+ | WR |
| 1-2 (small) | 50-64 | RB |
| 1-2 (small) | 35-49 | CB |
| 1-2 (small) | <35 | K |

## Stat growth curves

### Growth phase (ages 1-26)

| Age band | Athleticism | Technique | Football IQ | Notes |
| --- | --- | --- | --- | --- |
| 1-7 | +0 to +2 | - | - | Natural childhood growth |
| 8-10 | +1 to +3 | +1 to +3 | +0 to +2 | Learning curve |
| 11-13 | +1 to +3 | +1 to +3 | +0 to +2 | Moderate growth |
| 14-17 | +1 to +3 | +2 to +4 | +1 to +3 | Fast skill growth |
| 18-21 | +0 to +2 | +2 to +4 | +2 to +3 | Technique/IQ peak |
| 22-26 | +0 to +1 | +1 to +3 | +1 to +2 | Still improving |

### Peak and decline (ages 27-39)

| Age band | Athleticism | Technique | Football IQ | Health |
| --- | --- | --- | --- | --- |
| 27-29 | +0 to +0 | +0 to +2 | +0 to +2 | stable |
| 30-31 | -2 to +0 | +0 to +2 | +0 to +2 | stable |
| 32-36 | -4 to -2 | -1 to +1 | +0 to +1 | -2 to +0 |
| 37-39 | -5 to -3 | -2 to +0 | +0 to +0 | -3 to -1 |

## College offers

Three offers generated based on recruiting stars:

| Offer tier | Program type | Expected role | NIL | Draft exposure |
| --- | --- | --- | --- | --- |
| High prestige | Power conference | Redshirt or backup | High | High |
| Mid tier | FBS conference | Backup, compete | Medium | Medium |
| Small program | FCS or low FBS | Starter | Low | Low |

### Redshirt mechanic

- Offered at high-prestige schools (expected role = redshirt)
- Player can accept or compete for early playing time
- Redshirt year: no games, extra stat growth (+5 technique, +3 IQ)
- Adds 1 year of eligibility (5 total instead of 4)

## Offseason decisions

| Decision | Available ages | Description |
| --- | --- | --- |
| Position change | 15+ (offseason) | Request position change. Coach may approve. |
| Transfer portal | 18-20 (college) | Transfer to different school |
| Early declaration | 20 (junior) | Declare for NFL draft early if eligible |
| Trade request | 23+ (NFL) | Request trade to different team |
| Retirement | 32+ (NFL) | Voluntary retirement |

## Retirement triggers

| Trigger | Condition |
| --- | --- |
| Voluntary | Player chooses to retire (age 32+) |
| Forced (stats) | Health < 20 or athleticism + technique < 60 |
| Forced (age) | Age 39, season ends |
| Max seasons | 15+ NFL seasons |

## NFL salary by era

| Age band | Starter salary | Backup salary |
| --- | --- | --- |
| 22 (rookie) | $750K | $750K |
| 23-26 (early) | $5M | $1.5M |
| 27-31 (peak) | $12M | $3M |
| 32-36 (veteran) | $8M | $2M |
| 37-39 (late) | $5M | $1.2M |

## Weekly engine contract

Every call to the weekly loop must end in exactly one of:
- Next week started (week counter incremented)
- Season ended (end-of-season callback fired)

No third state. No path that silently returns without advancing.

## File map

```
src/core/
  year_handler.ts      -- YearHandler and CareerContext interfaces
  year_registry.ts     -- age-to-handler lookup
  year_runner.ts       -- year advancement dispatch
  register_handlers.ts -- registers all 13 handlers at boot

src/weekly/
  weekly_engine.ts     -- shared weekly loop with guaranteed advancement

src/shared/
  year_helpers.ts      -- stat drift, position assignment

src/childhood/
  kid_years.ts         -- ages 1-7
  peewee_years.ts      -- ages 8-10
  travel_years.ts      -- ages 11-13

src/high_school/
  hs_frosh_soph.ts     -- ages 14-15
  hs_varsity.ts        -- ages 16-17

src/college/
  college_entry.ts     -- age 18
  college_core.ts      -- ages 19-20
  college_senior.ts    -- age 21

src/nfl_handlers/
  nfl_rookie.ts        -- age 22
  nfl_early.ts         -- ages 23-26
  nfl_peak.ts          -- ages 27-31
  nfl_veteran.ts       -- ages 32-36
  nfl_late.ts          -- ages 37-39
```
