# Roadmap

Planned work, priorities, and what is intentionally not started.

## Current version (v1)

Complete career arc from birth to legacy is playable:

- Childhood (0-9), youth football (10-13)
- High school (14-17) with weekly loop, events, playoffs
- College (18-21) with weekly loop
- NFL (22-35+) with season-by-season events
- Retirement and legacy

## Near-term priorities

### Phase 1: Realism and immersion

- Real NCAA conferences and schedules (FBS/FCS CSV data)
- Conference standings visible after each week
- Full season schedule view
- Team-based color theming (implemented, needs wiring)
- Better status bar per career level
- Coach personality affects stat growth rates

### Phase 2: Academic system

- GPA tracking (0.0-4.0)
- Academic eligibility checks
- Junior college path for low GPA
- Classroom events affecting football career

### Phase 3: Relationship and social

- Relationship tracking (parents, coach, rivals, teammates)
- Relationship events and consequences
- Social media moments
- Driver's license milestone

### Phase 4: NFL depth

- NFL weekly loop (upgrade from season-by-season)
- Real contract negotiations with dollar amounts
- Free agency system
- Pro Bowl and Super Bowl simulation
- Hall of Fame tracking with realistic criteria

### Phase 5: Build pipeline -- COMPLETE

Shipped 2026-05-21 (see [docs/CHANGELOG.md](CHANGELOG.md) milestones M1-M9):
`tsc --noEmit` typecheck, esbuild bundle to `dist/main.js`, self-contained
`dist/` artifact (HTML, CSS, `.nojekyll`), npm script graph, smart
`check_codebase.sh` orchestrator, Prettier formatting, `.ts`-only typecheck,
and plugin JSON/CSV as esbuild bundle-time imports. An optional
`export_single_file.sh` portable single-HTML wrapper remains as future work
if and when needed (no current file exists at the repo root).

## Plugin architecture status

As of M6-A, the plugin host pattern is complete and proven. All four career-phase plugins (childhood, high_school, college, nfl) are wired and functional. Optional feature plugins (scout_report) are shipping as panel-only proofs with clean DOM boundary (index.ts registers only, panels/ handles render).

## Reactivation candidates (optional plugins)

Five disconnected features remain archived in `archive/disconnected_features/` (see `docs/TODO.md`). These are candidates for future optional plugin re-wiring (post-M6):

- `render/render_state.ts` - Switch render layer to dirty-flag optimization model (deferred pending profiling needs)
- `simulator/engine/clock.ts` - Wire clock refinements (two-minute warning, timeout tracking, play clock)
- `simulator/engine/clutch_checkpoint.ts` - Wire clutch moment UI and decision system
- `simulator/season/rankings.ts` - Wire weekly rankings display alongside conference standings
- `simulator/season/sim_non_player_games.ts` - Switch non-player game simulation to play-by-play engine for consistency
- `simulator/season/weekly_narrative.ts` - Wire weekly narrative generation into league display

Pattern for reactivating any: create `src/plugins/<feature>/`, move/adapt logic files, create panels/ with DOM boundary, register in `src/plugins/register_plugins.ts`. Scout Report (M6-A) exemplifies the pattern.

## Intentionally not started

- Multiplayer or online features
- Graphics or sprite-based visuals
- Sound effects or music
- App store packaging (staying as web app)
- Multiple sport support (football only for now)
