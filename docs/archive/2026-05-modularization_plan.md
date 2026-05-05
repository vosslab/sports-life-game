# Sports Life Game: Modularization And Architecture Reset

## Context

The user is worried `sports-life-game` is too fragile and not modular enough.
A deep-dive audit confirmed concrete structural debt:

- Five `.ts` files exceed 1,100 lines (`clutch_moment.ts` 1958, `main.ts` 1488,
  `ui.ts` 1440, `hs_phase.ts` 1201, `week_sim.ts` 1180).
- Three parallel phase implementations (`hs_phase.ts`, `college_phase.ts`,
  `nfl_phase.ts` = 2,669 lines combined) reimplement the same focus -> activity
  -> event -> game -> results loop. A newer `src/core/` + `src/weekly/`
  handler system exists but is only partially adopted.
- `src/player.ts` is imported by 23 files; god-type fan-in.
- `src/save.ts` has no schema version; ~30 optional-chaining defaults guess
  schema by field presence. Field renames silently lose data.
- `ui.ts` exposes 28 functions and is called directly from phase logic; 38 raw
  DOM mutations spread across simulation files.
- No TypeScript unit tests for simulator, season, save, or phase code.
- `docs/CODE_ARCHITECTURE.md` and `docs/FILE_STRUCTURE.md` describe the new
  handler system as if it were the architecture, but legacy phases still ship.

The project has no live players and no active feature work. Compatibility
pressure is low. Intended outcome: legacy structure removed cleanly,
simulation decoupled from DOM, save schema versioned, and core logic covered
by deterministic tests, without preserving scaffolding longer than needed.

## Design Philosophy (Top-Of-Plan, Avoid Drift)

1. **Fix architecture decisively while preserving buildability.** Project is
   inactive; short-term compatibility matters less than removing structural
   debt cleanly. Each milestone must compile and run, but legacy paths are
   deleted in the same milestone that replaces them. No long coexistence.
2. **One responsibility per file.** Simulation does not touch DOM. UI does
   not mutate `Player`. Save/load does not assume schema; it asks a versioned
   migrator. Type helpers, runtime behavior, and validators live in separate
   files when they change for different reasons.
3. **Contracts before code.** Each milestone starts by writing/extending a
   TypeScript `interface` (the contract). Implementations come second. The
   render-state contract lands early so the handler migration does not carry
   old UI assumptions forward.
4. **Tests before deletion.** Before removing a legacy file, a deterministic
   test must run the equivalent path under the replacement and assert player
   state matches a snapshot.
5. **No god-type alias forever.** `Player` lives as a temporary composed
   alias only through the phase migration; after that, modules import
   narrower types (`PlayerIdentity`, `PlayerStats`, etc.). A composed
   `PlayerSnapshot` survives only for save/load and whole-career snapshots.
6. **Docs change with code.** Architecture docs are updated in the same
   milestone that changes the architecture, not at the end.
7. **Style.** Per `docs/TYPESCRIPT_STYLE.md`: Prettier owns whitespace and
   line breaks; snake_case filenames; named exports only; no `var` (prefer
   `const`, then `let`); avoid `any`, prefer `unknown`; no wildcard imports;
   ASCII only; lines under 100 chars; explicit param and return types on
   exported functions.
8. **RNG ratchet, not big-bang.** `src/core/rng.ts` exists from M1. New
   or migrated simulation code must use it. Existing `Math.random()`
   calls are tracked by `tests/check_math_random_budget.ts`, which
   records the baseline count and fails only if the count increases.
   The allowed budget ratchets down at each milestone and must reach
   zero in simulation paths by M4/M5. The simulation tree is defined as:
   `src/core/`, `src/weekly/`, `src/simulator/`, `src/clutch/`,
   `src/season/`, `src/high_school/`, `src/college/`, and
   `src/nfl_handlers/`. UI, render, save, view_state, and `main.ts` are
   not part of the simulation tree.
9. **Allowed dependency direction.** `main` -> `core_engine` ->
   `phase_handlers` -> `weekly_engine` -> `simulator` / `season` /
   `clutch_engine` / `player_model`. `render_layer` consumes
   `view_state`; the simulation tree never imports `render_layer` or
   `ui_widgets`. Enforced by `tests/check_dom_imports.ts` (M5).

## Scope

In scope:

- Modularize `main.ts`, `ui.ts`, `hs_phase.ts`, `college_phase.ts`,
  `nfl_phase.ts`, `clutch_moment.ts`, `week_sim.ts`, `player.ts`, `save.ts`.
- Migrate all three phases onto `src/core/` + `src/weekly/` handlers and
  delete the legacy `*_phase.ts` files in the same milestone.
- Add a versioned save schema with explicit migrators.
- Introduce a render-state contract early, then build the render layer over
  it; eliminate raw DOM access from simulation files.
- Add a `tests/` TypeScript test harness with deterministic season runs.

## Non-Goals

- No new gameplay features mid-plan (no positions, events, mechanics).
- No visual redesign. Existing CSS stays.
- No framework migration (no React, Vue, Svelte). Plain TS + DOM.
- No build-system swap. Keep `npx tsc` and the existing single-bundle output.
- **Save reset.** Existing saves are intentionally unsupported after
  this refactor. On load, saves without the current `schemaVersion` are
  rejected and the game starts from a fresh default state. No v0
  migrator is required. Long-term compatibility begins at v1.

## Current State Summary

- Two architectures coexist: legacy `*_phase.ts` files and a partly-built
  `src/core/year_handler.ts` + `src/weekly/weekly_engine.ts` pipeline.
  `main.ts` still drives the legacy path.
- `src/player.ts` (513 lines) holds identity, stats, history, season totals,
  and per-phase fields in one `Player` interface.
- `src/save.ts` (151 lines) infers schema from field presence. No version.
- `src/ui.ts` (1,440 lines, 28 exports, 38 DOM calls) is the de facto render
  layer; phases call it inline during simulation.
- `tests/` contains only Python lint/ASCII checks. No simulator tests.

## Architecture Boundaries And Ownership

Durable component names (these go in code, filenames, tests):

| Component | Path | Owns |
| --- | --- | --- |
| `core_engine` | `src/core/` | Year handler interface, registry, year runner, RNG |
| `weekly_engine` | `src/weekly/` | Shared focus/activity/event/game/results pass |
| `simulator` | `src/simulator/` (split from `week_sim.ts`) | Pure game-day math; no DOM |
| `season` | `src/season/` | Schedule build, standings, playoffs |
| `clutch_engine` | `src/clutch/` (split from `clutch_moment.ts`) | 4Q clutch sim |
| `phase_handlers` | `src/high_school/`, `src/college/`, `src/nfl_handlers/` | Per-phase callbacks |
| `player_model` | `src/player/` (split from `player.ts`) | Narrow `Player*` types and pure helpers |
| `save_store` | `src/save/` (split from `save.ts`) | Versioned serialize/deserialize, migrators |
| `view_state` | `src/view_state/` (new, lands in M2) | Pull-model `GameViewState` contract |
| `render_layer` | `src/render/` (new, lands in M5) | `renderState(view)` -> DOM |
| `ui_widgets` | `src/ui/` (split from `ui.ts`) | Stat bars, modals, tables, headers |
| `social` | `src/social/` | Fotomagic feed (already isolated) |

### Mapping: Milestones And Workstreams To Components And Patches

- **M1 Foundations** -> `core_engine` (RNG), `tests/`, `save_store` (round-trip
  fixture only).
- **M2 Save, Player, View Contract** -> `save_store`, `player_model`,
  `view_state`. The `GameViewState` interface lands here so M3 builds
  against it.
- **M3 Phase Consolidation** -> `phase_handlers`, `weekly_engine`,
  `core_engine`. Each phase migrates and the legacy file is deleted in the
  same patch pair. `docs/CODE_ARCHITECTURE.md` updated in this milestone.
- **M4 Simulator And Clutch Split** -> `simulator`, `clutch_engine`.
- **M5 Render Layer And UI Split** -> `render_layer`, `ui_widgets`.
  `ui.ts` deleted; raw DOM access removed from simulation.
- **M6 Orchestrator Slimdown** -> `main.ts` -> bootstrap-only. Childhood and
  legacy summary moved to handlers.
- **M7 Final Docs And Archive** -> only doc files that did not move with
  their code; archive this plan.

Patch sizing target: <=400 changed lines per patch. Larger patches require an
explicit `Why oversized:` line in the corresponding `docs/CHANGELOG.md` entry.

File-size rule: no source file under `src/` exceeds 600 lines. An override
requires a line in `docs/CHANGELOG.md` naming the file and the reason; a
source-comment marker alone is not sufficient.

## Milestone Plan

### Milestone 1: Minimal Safety Rails

- **Goal:** Add only enough coverage to avoid blind edits during the
  reset. Do not build a full-career Node harness around the current
  tangled app; that would be sideways work that preserves the very
  architecture this plan is removing. Real deterministic tests arrive at
  M3 (handler level) and M4 (pure simulator), where the seams exist.
- **Depends on:** none.
- **Entry criteria:** Plan approved.
- **Patches:**
  - Patch 1 `src/core/rng.ts` mulberry32 seeded RNG and unit tests.
  - Patch 2 `tests/check_math_random_budget.ts` records the current
    `Math.random` baseline count and fails only if the count grows.
  - Patch 3 pure-helper characterization tests where easy (RNG done; add
    season helpers and any other pure utilities found).
  - Patch 4 Playwright smoke test that auto-plays one HS season via the
    existing `tests/autoplay.mjs` path; runs in CI/local.
- **Exit criteria:**
  - `npx tsc --noEmit` clean.
  - `npx tsx tests/test_rng.ts` passes.
  - `tests/check_math_random_budget.ts` passes at the recorded baseline.
  - One Playwright smoke run completes a full HS season in the browser.
  - **Explicitly out of scope for M1:** jsdom, DOM shims around `main.ts`
    or `ui.ts`, full-career deterministic Node harness,
    save-round-trip-against-fresh-default fixture (the save reset itself
    is M2 work).

### Milestone 2: Save Schema, Player Split, View Contract

- **Goal:** Make field renames safe, shrink `Player` god-type, and freeze
  the simulation->UI contract before phase migration begins.
- **Depends on:** M1 (round-trip test, RNG).
- **Entry criteria:** M1 exit met.
- **Exit criteria:**
  - Saves carry `{ schemaVersion: 1 }`. Load accepts only the current
    schema version. Missing, older, newer, or invalid `schemaVersion`
    values trigger a fresh-start path with a clear console warning and
    user-facing reset message. No v0 migrator is implemented.
    `src/save.ts` shrinks to a re-export shim; `src/save/index.ts` is
    canonical and is backed by `src/save/schema.ts`,
    `src/save/default_save.ts`, and `src/save/validate.ts`.
  - `Player` is split into `PlayerIdentity`, `PlayerStats`, `PlayerCareer`,
    `PlayerSeasonState` under `src/player/`. A composed `PlayerSnapshot`
    type exists for save/load and whole-career snapshots. A temporary
    `Player` alias remains only as a migration shim, removed at M3 exit.
  - `src/view_state/game_view_state.ts` defines `GameViewState` with the
    minimum shape needed by current `ui.ts` callers (header, stat bars,
    story log, career table, social feed). No implementation yet.
  - `docs/FILE_STRUCTURE.md` reflects the new directories.

### Milestone 3: Phase Consolidation (Migrate And Delete)

- **Goal:** Eliminate triple-implemented phase loops in one consolidation
  push. No long coexistence period.
- **Depends on:** M2 (player narrow types and `GameViewState` must exist).
- **Entry criteria:** M2 exit met.
- **Patch pairs (each pair lands together):**
  - P3.1a HS handler migration onto `weekly_engine`.
  - P3.1b Delete `src/hs_phase.ts`.
  - P3.2a College handler migration.
  - P3.2b Delete `src/college_phase.ts`.
  - P3.3a NFL handler migration.
  - P3.3b Delete `src/nfl_phase.ts`.
- **Exit criteria:**
  - `hs_phase.ts`, `college_phase.ts`, `nfl_phase.ts` deleted.
  - `main.ts` boots phases through `core/year_runner.ts`.
  - Per-phase logic lives as small handlers in `src/high_school/`,
    `src/college/`, `src/nfl_handlers/`.
  - Phase parity test compares normalized `PlayerSnapshot` objects
    field-by-field against the M1 baseline. The full final-state hash is
    asserted only after stripping documented volatile fields (RNG call
    counters, timestamps). Diffs are reported per field so failures are
    actionable.
  - Combined LOC across the three phase areas drops by >=1,200.
  - Temporary `Player` alias removed; importers reference narrow
    `Player*` types directly. `PlayerSnapshot` retained for save/load.
  - `docs/CODE_ARCHITECTURE.md` updated to reflect the unified handler
    architecture; references to legacy phases removed.

### Milestone 4: Simulator And Clutch Decomposition

- **Goal:** Break `week_sim.ts` (1,180) and `clutch_moment.ts` (1,958) into
  focused, pure modules.
- **Depends on:** M3 (handlers must be the stable caller).
- **Entry criteria:** M3 exit met.
- **Exit criteria:**
  - No file under `src/simulator/`, `src/clutch/`, or `src/week_sim*` over
    600 lines.
  - All simulator modules pure: zero DOM imports, zero `ui.*` calls, zero
    `Math.random` references.
  - `tests/test_simulator.ts` covers offense vs defense matchup math,
    clutch resolution, and stat accumulation.
  - `docs/CODE_ARCHITECTURE.md` updated for simulator and clutch split.

### Milestone 5: Render Layer And `ui.ts` Split

- **Goal:** Implement the render layer over the `GameViewState` contract
  from M2 and eliminate raw DOM access from simulation files.
- **Depends on:** M4.
- **Entry criteria:** M4 exit met.
- **Exit criteria:**
  - `src/render/` implements `renderState(view: GameViewState)` with
    pull-model + dirty flags.
  - `ui.ts` deleted; replaced by files under `src/ui/` each <=400 lines.
  - Phase handlers and simulator do not import `src/ui/` or `src/render/`.
  - `getElementById`/`querySelector`/`innerHTML` calls outside
    `src/render/`, `src/ui/`, `src/popup.ts`, `src/dom_utils.ts`,
    `src/tabs.ts`, `src/tab_manager.ts` reduced to zero.
  - `docs/CODE_ARCHITECTURE.md` updated for render layer.

### Milestone 6: `main.ts` Slimdown

- **Goal:** `main.ts` is a bootstrap, not a god orchestrator.
- **Depends on:** M5.
- **Entry criteria:** M5 exit met.
- **Exit criteria:**
  - `main.ts` <=300 lines.
  - Childhood narrative, position selection, legacy summary moved to
    `src/childhood/` and `src/legacy/` handlers.
  - Zero raw DOM access in `main.ts`.
  - `docs/FILE_STRUCTURE.md` updated.

### Milestone 7: Final Docs And Archive

- **Goal:** Catch any remaining doc drift and archive this plan.
- **Depends on:** M6.
- **Entry criteria:** M6 exit met.
- **Exit criteria:**
  - `docs/CODE_ARCHITECTURE.md` and `docs/FILE_STRUCTURE.md` audited
    against the post-refactor tree (most updates already happened in
    earlier milestones; this is the final sweep).
  - `docs/CHANGELOG.md` carries a milestone-close entry.
  - This plan moved to `docs/archive/` with a closure note linking the
    patches that delivered each milestone.

## Workstream Breakdown

### M1 Workstreams

- **W1.A Seeded RNG.** Owner: coder. Provides `src/core/rng.ts` and
  `tests/test_rng.ts`. Patch P1.1.
- **W1.B Math.random budget.** Owner: tester. Provides
  `tests/check_math_random_budget.ts` (baseline-count ratchet, not an
  absolute lint). Patch P1.2.
- **W1.C Pure-helper characterization tests.** Owner: tester. Add tests
  for any pure helpers easy to isolate (season helpers, position
  bucketing, stat clamps). Skip anything that needs DOM. Patch P1.3.
- **W1.D Playwright HS-season smoke.** Owner: tester. Wire
  `tests/autoplay.mjs` (or its Playwright equivalent) into a one-click
  smoke. Patch P1.4.

### M2 Workstreams

- **W2.A Save versioning.** Owner: coder. Work packages: 2. Provides
  `src/save/schema.ts`, `src/save/default_save.ts`,
  `src/save/validate.ts`, `src/save/index.ts`. No migrator registry; no
  v0 fixture. Patches P2.1, P2.2.
- **W2.B Player type split.** Owner: typescript-engineer. Work packages:
  2. Provides `src/player/identity.ts`, `src/player/stats.ts`,
  `src/player/career.ts`, `src/player/season_state.ts`,
  `src/player/snapshot.ts`, `src/player/index.ts` (transitional alias).
  Patch P2.3.
- **W2.C `GameViewState` contract.** Owner: architect. Work packages: 1.
  Provides `src/view_state/game_view_state.ts` with no implementation.
  Patch P2.4.

### M3 Workstreams

- **W3.A HS handler migration and legacy delete.** Owner: coder. Patch
  pair P3.1a + P3.1b.
- **W3.B College handler migration and legacy delete.** Owner: coder.
  Patch pair P3.2a + P3.2b.
- **W3.C NFL handler migration and legacy delete.** Owner: coder.
  Patch pair P3.3a + P3.3b.
- **W3.D Parity test and `Player` alias removal.** Owner: tester. Patch
  P3.4: deterministic-career diff test against M1 baseline; remove the
  transitional alias from `src/player/index.ts`.
- **W3.E Architecture doc update.** Owner: planner. Patch P3.5.

### M4 Workstreams

- **W4.A `week_sim.ts` split.** Owner: coder. Patch P4.1.
- **W4.B `clutch_moment.ts` split into `src/clutch/`.** Owner: coder.
  Patch P4.2.
- **W4.C Simulator unit tests.** Owner: tester. Patch P4.3.
- **W4.D Doc update.** Owner: planner. Patch P4.4.

### M5 Workstreams

- **W5.A Render layer implementation over the M2 contract.** Owner:
  coder. Patch P5.1.
- **W5.B `ui.ts` split.** Owner: coder. Patch P5.2.
- **W5.C Phase->render decoupling and DOM-leak removal.** Owner: coder.
  Patch P5.3.
- **W5.D Doc update.** Owner: planner. Patch P5.4.

### M6 Workstreams

- **W6.A Childhood/legacy extraction.** Owner: coder. Patches P6.1, P6.2.
- **W6.B `main.ts` cut.** Owner: coder. Patch P6.3.

### M7 Workstreams

- **W7.A Final doc sweep.** Owner: planner. Patch P7.1.
- **W7.B Plan archive.** Owner: planner. Patch P7.2.

## Work Package Template (Used For Assignment-Ready Chunks)

Example assignment-ready package:

- **Title:** Add current-version save schema and reset invalid saves.
- **Owner:** coder.
- **Touch points:** `src/save/index.ts`, `src/save/schema.ts`,
  `src/save/default_save.ts`, `src/save/validate.ts`, `src/save.ts`
  (shrink to re-export shim).
- **Acceptance criteria:**
  1. New saves write `{ schemaVersion: 1, ...payload }`.
  2. Loads accept only `schemaVersion: 1`.
  3. Missing, older, newer, or malformed saves return a fresh default
     save and surface a clear warning.
  4. Current-schema round-trip test passes.
  5. `src/save.ts` becomes a re-export shim.
- **Verification commands:**
  - `npx tsc --noEmit`
  - `npx tsx tests/run.ts -k save_round_trip`
- **Dependencies:** P1.1 (test harness must exist).

## Acceptance Criteria And Gates

Per-milestone gates are the Exit criteria above. Cross-cutting gates that
apply to every milestone:

- `npx tsc --noEmit` clean.
- `npx eslint src/` clean (no new warnings).
- `npx tsx tests/run.ts` deterministic-career hash matches M1 baseline,
  or change is documented in `docs/CHANGELOG.md` with rationale.
- `tests/check_no_math_random.ts` passes.
- No source file under `src/` exceeds 600 lines without a justification
  entry in `docs/CHANGELOG.md`.
- `docs/CHANGELOG.md` has a dated entry naming the patches landed.

## Test And Verification Strategy

- **M1: characterization tests only.** No full-career Node harness.
  Pure helpers + RNG + Math.random budget + Playwright smoke.
- **M2: save round-trip.** After the reset lands and `src/save/` is
  canonical, write a v1 round-trip test against a fresh default save.
- **M3: deterministic handler-level tests.** Once phases run through the
  handler+`weekly_engine` pipeline, deterministic phase-path tests
  become realistic.
- **M4: simulator and clutch unit tests.** Once those modules are pure,
  test offense vs defense matchup math, clutch resolution, stat
  accumulation directly.
- **M5: render/DOM tests if needed.** Possibly with jsdom, only after
  render is isolated.
- **Every milestone:** Playwright smoke test remains the end-to-end
  guard.
- **Phase parity test (M3).** Run the same career under legacy phases
  (last commit before M3) and new handlers. Compare normalized
  `PlayerSnapshot` field-by-field, reporting per-field diffs. The full
  hash is asserted only after stripping documented volatile fields.
- **Simulator unit tests (M4).** Pure-function tests for offense/defense
  matchup, clutch resolution, stat accumulation.
- **DOM-leak check (M5).** `tests/check_dom_imports.ts` fails if
  simulation files import `document` or `src/render/`/`src/ui/`.
- **Smoke test (every milestone).** `./run_game.sh`, then a Playwright
  script (`docs/PLAYWRIGHT_USAGE.md`) auto-plays one HS season and one
  college week.

## Migration And Compatibility Policy

- **Migrate-and-delete in the same milestone.** Replacements ship with
  legacy deletion in the same patch pair where feasible (M3).
- **Save reset.** Existing saves are intentionally unsupported. Only
  `schemaVersion: 1` loads; anything else triggers a fresh start. No
  migrators are implemented or maintained.
- **`Player` alias is transitional.** Lives only through M3, then
  removed. `PlayerSnapshot` (composed) survives for save/load.
- **Deletion criteria for legacy code:** (a) zero importers, (b) parity
  test green, (c) one full smoke playthrough.

## Risk Register

| Risk | Impact | Trigger | Owner | Mitigation |
| --- | --- | --- | --- | --- |
| Phase parity test diverges due to RNG ordering | M3 stalls | Hash mismatch | tester | Allow listed diffs; lock RNG call order in handlers |
| `GameViewState` contract under-specified | M5 rework | Missing fields surface late | architect | Land contract in M2, audit against current `ui.ts` callers |
| `ui.ts` split creates circular imports | M5 stalls | tsc errors | typescript-engineer | Render layer never imports phase code; one-way deps |
| Doc drift returns | Future fragility | Architecture changes without doc update | planner | Doc updates required in same milestone, not deferred |
| Test harness too slow | Devs skip it | >10s | tester | Cap simulated career length in fixture |
| File-size override abuse | Re-bloat | Files exceed 600 lines | reviewer | Enforce changelog justification; review on every PR |

## Rollout And Release Checklist

- Each milestone lands on `main` only after its Exit criteria are met.
- `VERSION` bumped per milestone (CalVer per `docs/REPO_STYLE.md`).
- `docs/CHANGELOG.md` updated by the agent before each merge; the human
  commits.
- No release tag until M7 closes.

## Documentation Close-Out Requirements

Per milestone, the agent must:

- Add a dated `docs/CHANGELOG.md` entry under the correct subsection
  headings (Additions, Behavior Changes, Fixes, Removals, Decisions,
  Tests).
- Update `docs/CODE_ARCHITECTURE.md` and `docs/FILE_STRUCTURE.md` in the
  same milestone where the architecture or layout actually changed (M2,
  M3, M4, M5, M6). M7 is only a final audit sweep.
- Update `docs/ROADMAP.md` to mark the milestone done.

At M7 close: archive this plan to `docs/archive/` with a one-paragraph
closure note linking the patches that delivered each milestone.

## Patch Plan And Reporting Format

Format: `Patch N: [component] [intent]`.

- Patch 1: tests deterministic-career harness.
- Patch 2: tests simulator smoke coverage.
- Patch 3: core_engine seeded RNG.
- Patch 4: tests no-Math-random lint.
- Patch 5: save_store schema, default_save, and validate modules.
- Patch 6: save_store reset-on-mismatch loader and round-trip test.
- Patch 7: player_model split into identity/stats/career/season_state/snapshot.
- Patch 8: view_state GameViewState contract.
- Patch 9a/9b: phase_handlers HS migration + legacy delete.
- Patch 10a/10b: phase_handlers college migration + legacy delete.
- Patch 11a/11b: phase_handlers NFL migration + legacy delete.
- Patch 12: tests phase parity, remove Player alias.
- Patch 13: docs architecture update for unified handlers.
- Patch 14: simulator week_sim decomposition.
- Patch 15: clutch_engine clutch_moment decomposition.
- Patch 16: tests simulator unit coverage.
- Patch 17: docs architecture update for sim/clutch split.
- Patch 18: render_layer implementation over GameViewState.
- Patch 19: ui_widgets ui.ts split.
- Patch 20: phase_handlers DOM-leak removal.
- Patch 21: docs architecture update for render layer.
- Patch 22: core_engine main.ts childhood/legacy extraction.
- Patch 23: core_engine main.ts slimdown.
- Patch 24: docs final audit and plan archive.

## Open Questions And Decisions Needed

All decided per user direction:

1. **Test runner.** `tsx` + plain `assert`. Add Vitest later only if test
   organization becomes painful. (Decided.)
2. **RNG library.** In-tree mulberry32 in `src/core/rng.ts`; lint forbids
   `Math.random` in simulation files. (Decided.)
3. **Render layer style.** Pull-model with dirty flags; contract lands in
   M2, implementation in M5. (Decided.)
4. **`Player` alias retention.** Transitional through M3, then removed.
   `PlayerSnapshot` (composed) survives only for save/load. (Decided.)
5. **New features mid-plan.** Defer completely until M5 closes at the
   earliest. (Decided.)
6. **Existing saves.** Dropped. The refactor intentionally resets all
   old saves. Only `schemaVersion: 1` is supported after M2. (Decided.)

**Review cadence (decided).** Human review at end of M2, M3, and M5.
Agents run M1, M4, M6, and M7 to closure provided tests stay green. M2,
M3, and M5 are foundational/architectural cuts that are hard to reverse;
M1 is infrastructure and does not need a checkpoint unless the test
harness exposes unexpected behavior.
