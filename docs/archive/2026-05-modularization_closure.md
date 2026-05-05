# Modularization plan closure (2026-05-05)

Archive note for [2026-05-modularization_plan.md](2026-05-modularization_plan.md)
("Sports Life Game: Modularization And Architecture Reset"). All seven
milestones landed. Sources of truth post-refactor:

- [docs/CODE_ARCHITECTURE.md](../CODE_ARCHITECTURE.md) for component map
- [docs/FILE_STRUCTURE.md](../FILE_STRUCTURE.md) for layout
- [docs/CHANGELOG.md](../CHANGELOG.md) for the dated record of every patch

## Milestone summary

| Milestone | Outcome |
| --- | --- |
| M1 Foundations | Seeded RNG (`src/core/rng.ts`), Math.random budget script, pure-helper tests, Playwright smoke wrapper |
| M2 Save + Player + ViewState | Schema v1 with reset-on-mismatch loader; `Player` split into `PlayerIdentity`, `PlayerStatsBundle`, `PlayerCareer`, `PlayerSeasonState`, `PlayerSnapshot`; `GameViewState` contract landed in `src/view_state/` |
| M3 Phase consolidation | `hs_phase.ts`, `college_phase.ts`, `nfl_phase.ts` deleted (>1,200 LOC removed); per-phase logic now lives in `src/high_school/`, `src/college/`, `src/nfl_handlers/` driven by `src/weekly/weekly_engine.ts`; transitional `Player` alias retained as a composed type |
| M4 Simulator + clutch split | `week_sim.ts` (1,180 lines) and `clutch_moment.ts` (1,958 lines) decomposed into `src/week_sim/` and `src/clutch/`; no source file in the simulation tree exceeds 600 lines; `Math.random` budget reached 0/0; reality-check side scripts added to `tools/` to validate the simulator API |
| M5 Render layer + UI split | `src/render/render_state.ts` implements `renderState(view)` over the M2 contract; `src/ui.ts` (1,440 lines) replaced by 11 widget modules under `src/ui/`; zero UI imports in the simulation tree; `weekly_engine` rewired through `CareerContext` |
| M6 main.ts slimdown | `src/main.ts` 1,357 -> 283 lines (bootstrap-only); story log moved to `src/render/story_log.ts`; character creation moved to `src/childhood/character_creation.ts` (with `CharacterCreationContext`); retirement moved to `src/legacy/retirement.ts` (with `RetirementContext`); name CSV loader wired via `src/childhood/name_loader.ts` |
| M7 Final docs + archive | This note. `CODE_ARCHITECTURE.md` and `FILE_STRUCTURE.md` audited against the post-refactor tree; legacy file references removed |

## Architecture invariants now in force

- Allowed dependency direction: `main` -> `core_engine` -> `phase_handlers`
  -> `weekly_engine` -> `simulator` / `season` / `clutch_engine` /
  `player_model`. `render_layer` consumes `view_state`. The simulation
  tree never imports `render_layer` or `ui_widgets`.
- Simulation tree is `src/core`, `src/weekly`, `src/simulator`,
  `src/clutch`, `src/season`, `src/high_school`, `src/college`,
  `src/nfl_handlers`. `Math.random` budget for those paths is 0.
- Save schema v1 is the only supported version; older or invalid saves
  are reset on load.
- Source files under `src/` stay under 600 lines without a documented
  override.

## Deferred

Simulator realism gaps surfaced by `tools/sim_positions.ts` and
`tools/sim_distribution.ts` (defender bucket collapse, QB completion %,
kicker FG %, RB YPC variance) were intentionally not tuned during the
refactor. They are the natural next workstream now that the simulator
API is stable and pure.
