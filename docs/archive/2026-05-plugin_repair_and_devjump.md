# Plugin repair and dev-jump

Repair broken avatar rendering, audit and fix non-working plugins, and ship a developer fast-jump mechanism so testers can land in any phase (childhood, high_school, college, nfl, legacy) without clicking through hundreds of weekly choices.

## Context

The plugin architecture under `src/plugins/` (see [PLUGIN_ARCHITECTURE.md](../PLUGIN_ARCHITECTURE.md)) hosts five plugins (`childhood`, `high_school`, `college`, `nfl`, `scout_report`) wired through `src/plugins/register_plugins.ts`. The core game loop drives phase advancement via `src/core/year_runner.ts` and `src/core/year_handler.ts`. Player state is persisted by `src/save.ts` / `src/save/index.ts`.

Three problems observed:

- Avatar rendering: `src/avatar.ts` (794 lines, modular SVG portrait generator) plus parts in `src/data/avatar_parts.ts` is reported broken. Output is missing, malformed, or no longer matches `src/data/avatar_parts.ts`. Root cause not yet pinned.
- Plugin breakage: several plugin lifecycle hooks (suspect candidates: `src/plugins/childhood/lifecycle/age_5_first_football.ts`, `src/plugins/high_school/lifecycle/drivers_permit.ts`, `src/plugins/college/lifecycle/nfl_declaration.ts`, `src/plugins/nfl/lifecycle/nfl_entry.ts`, `src/plugins/nfl/lifecycle/retirement.ts`) and/or their phase handlers no longer fire correctly. Symptom: gameplay reaches a phase boundary but the expected lifecycle event does not run, or panels do not render. Specific failing plugins unknown until audit.
- Test friction: only entry point is "new game from age 0". Reaching NFL level requires 22+ in-game years of weekly clicks. Manual testing of NFL or college plugins is impractical, which blocks both bug-hunting and feature work.

No dev/debug skip mechanism exists today (`git ls-files | grep -iE "(dev|debug|skip|jump|cheat)"` returns only build/changelog tooling). The save system (`src/save.ts`) is the only existing way to land in a mid-career state, and only if a save was reached by play.

Stabilization-first: avatar and plugin failures are core failures; ship those repairs before designing new content. Dev-jump is execution infrastructure, not new gameplay -- it unblocks the repair work itself.

## Objectives

- Restore avatar rendering to known-good visual quality across all archetypes and ages.
- Identify, document, and fix every broken plugin lifecycle hook and panel.
- Provide a developer fast-jump UI (or URL param + console API) that constructs a synthetic `Player` already at a chosen phase and age, with sane defaults, and drops the user into the live game loop.
- Add lightweight regression coverage so the next sync does not silently re-break these areas.

## Design philosophy

This plan optimizes for unblocking iteration speed first (dev-jump in M1) so the repair work in M2-M3 can be verified in seconds rather than minutes. Alternative considered and rejected: fix plugins first, dev-jump later. Rejected because verifying an NFL-plugin fix without dev-jump requires a full playthrough per change, which kills iteration. Cites `docs/REPO_STYLE.md` "fix the design, not the symptom" -- broken plugins get root-cause fixes (re-register, re-wire, repair data shape) rather than silent fallbacks; and "atomic task decomposition" -- one plugin per work package so coders ship independently.

## Scope

- `src/avatar.ts`, `src/data/avatar_parts.ts`, and any existing `avatar_test.html` harness.
- All five plugins under `src/plugins/` (`childhood`, `high_school`, `college`, `nfl`, `scout_report`) including their `lifecycle/`, `panels/`, `events/`, `activities*`, and `phase_handler.ts` files.
- Plugin registries under `src/plugins/registries/` only if audit identifies a registry-level bug.
- A new dev-jump entry point: `src/dev/dev_jump.ts` (new module) plus a hidden hotkey or `?dev=nfl&age=24` URL parameter in `src/main.ts`.
- Tests under `tests/test_plugin_host.ts`, `tests/test_handler_registry.ts`, `tests/test_plugin_boundaries.ts`, and a new `tests/test_dev_jump.ts`.
- Playwright smoke under `tests/playwright/` for avatar render and dev-jump landing.

Out of scope:

- New plugins or new content packs.
- New phases beyond the existing five.
- Save-file schema migration (dev-jump constructs in-memory state only, no on-disk save format change).
- UI redesigns beyond restoring broken panels.

## Non-goals

- Do not redesign the plugin host API. Audit and repair only.
- Do not introduce a settings UI for the dev-jump. URL param + hidden hotkey is enough.
- Do not gate dev-jump behind a build flag. Hidden by default in the released bundle is acceptable (no menu entry); discoverable only by URL/hotkey.
- Do not rewrite `src/avatar.ts` from scratch unless the audit proves the modular SVG approach itself is the failure (escalate to user before scrapping).

## Architecture boundaries

- Avatar component owns: `src/avatar.ts`, `src/data/avatar_parts.ts`, `avatar_test.html`. No other module writes SVG.
- Plugin components: each of the five plugins is its own component; cross-plugin imports remain banned by `tests/test_plugin_boundaries.ts`.
- Dev-jump component owns: `src/dev/dev_jump.ts` (new) plus a narrow integration point in `src/main.ts`. Dev-jump reads from plugin registries via `PluginHost` (read-only) and constructs `Player` via existing factories in `src/player/`. Dev-jump must not duplicate phase-entry logic; it must call the same `startYear` / `advanceToNextYear` entry that production uses.
- Save module (`src/save.ts`) is untouched. Dev-jump explicitly does NOT persist its synthetic player unless the tester saves manually.

### Mapping: milestones to components and patches

- M1 Dev-jump infrastructure -> Component: new `src/dev/dev_jump.ts`. Patches: P1.1 (skeleton + URL param), P1.2 (UI hotkey + phase picker), P1.3 (test harness).
- M2 Avatar repair -> Component: avatar. Patches: P2.1 (diagnose), P2.2 (fix), P2.3 (visual regression test).
- M3 Plugin audit and repair -> Component: plugins (one work package per plugin). Patches: P3.childhood, P3.high_school, P3.college, P3.nfl, P3.scout_report.
- M4 Regression and docs -> Component: tests + docs. Patches: P4.1 (tests), P4.2 (docs/CHANGELOG, docs/USAGE dev-jump section).

## Milestones

### M1 Dev-jump infrastructure

Parallel-plan ready: yes (3 workstreams: W1.A skeleton + URL parser, W1.B hotkey UI, W1.C player factory + tests). W1.C depends on W1.A.

Workstreams:

- W1.A `dev_jump_core` -- create `src/dev/dev_jump.ts`. Export `applyDevJump(host: PluginHost, params: DevJumpParams): Player`. Parse `?dev=<phase>&age=<n>&team=<id>` in `src/main.ts` before save-load check. Depends on: none.
- W1.B `dev_jump_ui` -- bind a hidden hotkey (e.g. Ctrl+Shift+J) that opens a minimal phase/age picker overlay. Depends on: W1.A (needs `applyDevJump`).
- W1.C `dev_jump_player_factory` -- in `src/dev/dev_jump.ts`, build a `Player` with phase-appropriate defaults (sane stats, age, team, season_state, identity). Reuse existing factories in `src/player/`. Must not duplicate `startNewGameFlow` logic; call the same downstream entry (`advanceToNextYear` or `startYear`). Add `tests/test_dev_jump.ts` covering each phase. Depends on: W1.A.

Exit criteria:

- `?dev=nfl&age=24` URL drops a fresh tester into NFL phase, age 24, with a valid Player state, in under 2 seconds wall-clock, no clicks.
- All five phases (`childhood`, `high_school`, `college`, `nfl`, `legacy`) reachable via URL param.
- `npm run typecheck`, `npm run lint`, `npm run test:node` green.
- Obvious follow-ons: update `docs/USAGE.md` with one paragraph on dev-jump; add entry to `docs/CHANGELOG.md`.

Max parallel doers: 2 (W1.A solo first, then W1.B and W1.C concurrent).

### M2 Avatar repair

Parallel-plan ready: yes (2 workstreams: W2.A diagnose, W2.B fix + visual regression). W2.B depends on W2.A's findings.

Workstreams:

- W2.A `avatar_diagnose` -- reproduce the breakage. Open `avatar_test.html` (or dev-jump to a phase that renders a portrait). Capture: console errors, SVG inspector output, which archetype/age combinations fail, whether `src/data/avatar_parts.ts` keys still match `src/avatar.ts` lookups. Produce a short failure report (one or two paragraphs in the work package handoff). Depends on: M1 (uses dev-jump to reach phases quickly).
- W2.B `avatar_fix_and_test` -- apply the smallest fix that restores rendering for all archetypes. Add a Playwright snapshot under `tests/playwright/test_avatar_render.spec.ts` (or `.mjs`) that loads `avatar_test.html` (or invokes the avatar via dev-jump) and snapshots one portrait per archetype. Depends on: W2.A.

Exit criteria:

- All six archetypes (`player`, `rival`, `coach`, `recruiter`, `scout`, `generic`) render visible SVG portraits in browser.
- Playwright snapshot baseline committed to `tests/playwright/snapshots/`.
- `docs/PORTRAIT_SYSTEM.md` notes the root cause in a short "Known Failure 2026-05" entry if non-obvious.
- Obvious follow-ons: changelog entry; if `src/data/avatar_parts.ts` keys changed, update `docs/PORTRAIT_SYSTEM.md` part inventory table.

Max parallel doers: 1 effective (W2.A and W2.B are sequential; W2.B can run alongside M3 workstreams).

### M3 Plugin audit and repair

Parallel-plan ready: yes (5 workstreams, one per plugin). All independent because of `tests/test_plugin_boundaries.ts` cross-plugin import ban.

Workstreams (one work package per plugin, each owns its plugin directory):

- W3.childhood -- audit `src/plugins/childhood/`. Verify `lifecycle/age_5_first_football.ts` fires at age 5, `childhood_entry.ts` runs on phase entry, panel renders. Depends on: M1.
- W3.high_school -- audit `src/plugins/high_school/`. Verify `lifecycle/hs_entry.ts` and `lifecycle/drivers_permit.ts` fire at correct ages; panels render. Depends on: M1.
- W3.college -- audit `src/plugins/college/`. Verify `lifecycle/college_entry.ts` and `lifecycle/nfl_declaration.ts` fire; panels render. Depends on: M1.
- W3.nfl -- audit `src/plugins/nfl/`. Verify `lifecycle/nfl_entry.ts`, `lifecycle/draft_day.ts`, `lifecycle/retirement.ts` fire; panel renders. Depends on: M1.
- W3.scout_report -- audit `src/plugins/scout_report/`. Verify panel renders during recruiting weeks. Depends on: M1.

For each workstream:

1. Use dev-jump to land in the relevant phase.
2. Step through one in-game year, observing whether each registered lifecycle hook fires.
3. Cross-check against `src/plugins/registries/lifecycle_registry.ts` to confirm registration order and event names match.
4. Apply minimal fix (re-register, fix typo in event name, fix Player field access, repair JSON schema mismatch).
5. Add or extend `tests/test_plugin_host.ts` (or new `tests/test_plugin_<name>.ts`) with one test per fired lifecycle hook proving it fires given a synthetic Player.

Exit criteria:

- Every lifecycle hook listed in each plugin's `lifecycle/hooks.ts` fires in a verification test.
- Every plugin's `panels/career_panel.ts` (where present) renders without console error when dev-jumped into its phase.
- `tests/test_plugin_boundaries.ts` still passes (no cross-plugin imports introduced).
- Per-plugin changelog bullet under `### Fixes and Maintenance` for 2026-05-22+.
- Obvious follow-ons: if any plugin needs deeper redesign than a minimal fix, file a new plan in `docs/active_plans/active/` rather than expanding scope here.

Max parallel doers: 5 (one per plugin). Realistic: 2-3.

### M4 Regression and docs

Parallel-plan ready: yes (2 workstreams).

Workstreams:

- W4.A `regression_tests` -- consolidate per-plugin tests, ensure `npm run test:node` covers all lifecycle fires; verify dev-jump tests still pass after M2 and M3. Depends on: M2, M3.
- W4.B `docs_closeout` -- update `docs/CODE_ARCHITECTURE.md` if architecture shifted; add dev-jump section to `docs/USAGE.md`; finalize `docs/CHANGELOG.md` entries; archive this plan to `docs/archive/2026-05-plugin_repair_and_devjump.md` via `git mv`. Depends on: M1, M2, M3.

Exit criteria:

- Full gate green: `bash check_codebase.sh`.
- Playwright autoplay (`tests/playwright/autoplay.mjs`) still passes end-to-end.
- Plan file moved to archive.

Max parallel doers: 2.

## Acceptance gates

- Gate G1 (M1 done): URL param dev-jump lands tester in any phase; tests in `tests/test_dev_jump.ts` pass.
- Gate G2 (M2 done): Playwright avatar snapshot baseline committed; manual visual inspection in browser confirms portraits look like reference in `docs/PORTRAIT_SYSTEM.md`.
- Gate G3 (M3 done): For each of the five plugins, a verification test proves every registered lifecycle hook fires when its trigger condition is met using a synthetic dev-jumped Player.
- Gate G4 (release): `bash check_codebase.sh` green; `tests/playwright/autoplay.mjs` green; manual smoke: dev-jump to NFL age 24, play 5 weeks, observe no console errors; plan archived.

## Risks

| ID  | Risk                                                                                       | Impact                                       | Trigger                                | Owner         | Mitigation                                                                                                |
| --- | ------------------------------------------------------------------------------------------ | -------------------------------------------- | -------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------- |
| R1  | Dev-jump produces an invalid `Player` shape that diverges from prod                        | Tests pass but prod breaks                   | M1 W1.C cuts corners on player factory | M1 W1.C owner | Reuse `src/player/` factories verbatim; do not inline construction                                        |
| R2  | Avatar root cause is a data-shape mismatch in `src/data/avatar_parts.ts` from a prior sync | Fix balloons into avatar-parts re-extraction | M2 W2.A reports keys do not match      | M2 owner      | Cap M2 at minimal-keys-restore; escalate to user before re-extracting parts                               |
| R3  | Plugin breakage is a single registry bug, not per-plugin                                   | M3 splits into 5 streams unnecessarily       | M3 W3.childhood fix also fixes others  | M3 lead       | First plugin owner reports findings before others start; restructure if registry-level                    |
| R4  | Dev-jump becomes a player-facing cheat menu                                                | Scope creep                                  | M1 W1.B owner adds polish              | M1 W1.B owner | Hidden hotkey only; no menu entry in main UI; no save-file persistence                                    |
| R5  | Playwright snapshot drift on minor CSS changes                                             | Avatar gate becomes noisy                    | M2 W2.B uses too-strict pixel diff     | M2 W2.B owner | Use Playwright's `maxDiffPixelRatio` or structural assert (SVG element count + presence) over pixel-exact |

## Migration and compatibility

- No save-file schema change. Existing saves continue to load via `src/save.ts`.
- Dev-jump is additive; absent the URL param or hotkey, game behavior is unchanged.
- Plugin fixes are bug fixes, not API changes. Plugin host interface (`src/plugins/plugin_host.ts`) frozen unless M3 audit proves a registry-level bug; in that case, escalate before changing.
- Avatar repair preserves `AvatarConfig` interface unless audit proves the interface itself is wrong.

## Documentation

- `docs/CHANGELOG.md`: one bullet per patch under appropriate 2026-05-xx day block.
- `docs/USAGE.md`: new "Developer fast-jump" section after M1.
- `docs/PORTRAIT_SYSTEM.md`: failure note after M2 if root cause non-obvious.
- `docs/PLUGIN_ARCHITECTURE.md`: only update if M3 audit reveals an architecture-level issue.
- `docs/active_plans/active/plugin_repair_and_devjump.md` -> `docs/archive/2026-05-plugin_repair_and_devjump.md` on close.

## Open decisions

- DEC-1 (M1 W1.B owner): hotkey choice (Ctrl+Shift+J vs query-string-only). Default to query-string-only if owner judges hotkey adds complexity.
- DEC-2 (M2 W2.A owner): if avatar root cause is a corrupted `src/data/avatar_parts.ts`, regenerate from `docs/superpowers/specs/2026-04-04-modular-svg-avatar-design.md` source or escalate. Owner decides after diagnosis.
- DEC-3 (M3 lead, after first plugin audit): if breakage is registry-level not per-plugin, collapse W3.\* into one workstream and re-plan.

## Parallel-plan handoff

Recommended dispatch order after this plan is approved:

1. M1 W1.A solo (unblocks everything).
2. M1 W1.B + M1 W1.C in parallel.
3. M2 W2.A + M3.childhood + M3.high_school + M3.college + M3.nfl + M3.scout_report in parallel (5-6 doers max).
4. M2 W2.B after W2.A reports.
5. M4 W4.A + M4 W4.B in parallel after M2 and M3 done.
