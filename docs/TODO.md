# TODO

Backlog of small tasks without timelines.

## Bugs

- [ ] Playoff POTW tracking uses old guaranteed system in some code paths
- [ ] College opponent names still use HS name generator (needs NCAA CSV)
- [ ] Status bar needs better info per level (HS: record + recruiting, college: record + draft stock, NFL: record + salary)
- [ ] Conference standings not yet wired into weekly game flow
- [ ] Schedule view not yet wired into weekly game flow
- [ ] NFL season events need the same POTW probability fix as HS

## Content

- [ ] Add more childhood events (target 5+ per age bracket)
- [ ] Add college-specific events to events.json (phase: "college")
- [ ] Add NFL-specific events to events.json (phase: "nfl")
- [ ] Wire GPA stat into weekly choices and event effects
- [ ] Wire relationship scores into event effects and story text
- [ ] Add academic eligibility checks at season start

## Polish

- [ ] Wire NCAA CSV schools into college team assignment
- [ ] Wire first_names.csv and last_names.csv into all name generation (rivals, coaches, teammates)
- [ ] Multiple save slots (character select screen)
- [ ] Show GPA in stats panel or status bar during school phases
- [ ] Show relationships in a viewable panel

## Disconnected features (archived 2026-05-19)

These features were implemented but never wired into the live engine. Code is preserved in `archive/disconnected_features/` for future reactivation.

- [ ] `scout_report.ts` - NFL draft scout reports; generates specific feedback about draft stock projections
- [ ] `render/render_state.ts` - Pull-model render layer with dirty-flag optimization for DOM updates
- [ ] `simulator/engine/clock.ts` - Game clock management; handles runoffs, quarter transitions, time tracking
- [ ] `simulator/engine/clutch_checkpoint.ts` - Clutch moment system bridge; separates UI narrative from play simulation
- [ ] `simulator/season/rankings.ts` - Weekly rankings computation for league-wide standings
- [ ] `simulator/season/sim_non_player_games.ts` - Play-by-play engine for non-player games (consistent with player games)
- [ ] `simulator/season/weekly_narrative.ts` - Weekly narrative generator from league simulation results
