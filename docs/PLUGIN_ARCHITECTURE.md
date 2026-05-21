# Plugin architecture

## Overview

The plugin architecture is a vertical-slice extension model layered on top of
the existing year-handler registry. A plugin is a self-contained bundle that
can register year handlers, narrative events, choices, rule references, UI
surfaces, lifecycle hooks, activities, and data packs through a single
`PluginHost` facade. Each plugin owns one feature area end to end rather than
spreading scattered registrations across the codebase.

The model extends, and does not replace,
[src/core/year_registry.ts](../src/core/year_registry.ts). The existing
age-to-handler map is still the source of truth for year dispatch; the plugin
host wraps that registry (and seven sibling registries) behind a uniform
`register / lookup / getAll / clear` shape. Plugins keep their content in
their own folder under `src/plugins/<plugin_name>/`, and the boot path
([src/plugins/register_plugins.ts](../src/plugins/register_plugins.ts), added
in WP-M1-C) calls each plugin's `register(host)` once before the game loop
starts.

The hard rule that makes this work is one-way coupling: core code does not
import from any plugin. Plugins import core types (`Player`, `YearHandler`,
`CareerContext`, etc.) and register against the host; core never reaches back.
The host itself is a thin router with zero business logic. This keeps phase
folders, the simulator, and core engine modules free of plugin coupling and
lets plugins be added, removed, or replaced without touching the engine.

## PluginHost surface

The `PluginHost` facade exposes eight registries. Each registry owns one
content type and offers a `register` (and sometimes `registerMany`) entry
point plus lookup helpers.

| Registry | Owns | Key registration method |
| --- | --- | --- |
| `phases` | Year handlers (per age band) | `host.phases.register(handler)` |
| `events` | Narrative `GameEvent` records | `host.events.register(event)` / `registerMany` |
| `choices` | `WeeklyChoice` records (JSON-loaded, keyed by `id`) | `host.choices.register(choice)` / `registerMany` |
| `rules` | `RuleSetReference` pointers to simulator rule modules | `host.rules.register(ruleSetRef)` |
| `ui` | Tabs, panels, widgets | `host.ui.registerTab` / `registerPanel` / `registerWidget` |
| `lifecycle` | Age, phase-start, career-end hooks | `host.lifecycle.registerAgeHook` / `registerPhaseStartHook` / `registerCareerEndHook` |
| `activities` | Weekly `Activity` entries | `host.activities.register(activity)` / `registerMany` |
| `dataPacks` | Arbitrary `DataPack` content bundles | `host.dataPacks.register(pack)` |

## Contract index

All contract types listed below live in
[src/plugins/plugin_host.ts](../src/plugins/plugin_host.ts). Line anchors
are intentionally omitted; the file is the source of truth and line numbers
drift with edits.

### GamePlugin

The contract every plugin implements. Fields: `name` (unique id; duplicate
registration throws), optional `version` for diagnostics, and
`register(host: PluginHost): void`. Each plugin exports one `GamePlugin`
instance.

### PluginHost

The central facade. Plain object whose eight fields are the registries
listed in the surface table above. Plugins receive the host in
`register(host)` and call into the sub-registries.

### AgeHook

Lifecycle hook keyed on player age. Fires at an exact `age` or within an
inclusive `ageRange`. Optional `condition`, `once` (default true), and
`priority` fields control firing semantics and deterministic ordering.

### PhaseStartHook

Lifecycle hook keyed on `CareerPhase` entry. Used for phase-transition
moments such as draft day when entering the `nfl` phase.

### CareerEndHook

Lifecycle hook keyed on a `trigger` of `retirement`, `hof_eligibility`, or
`forced_retirement`.

### PhaseRegistry

Year-handler registry surface. Mirrors the existing year_registry shape.

### EventRegistry

`GameEvent` registry. Adds `registerMany` for bulk event-pack loading.

### ChoiceRegistry

`WeeklyChoice` registry. Choices are JSON-loaded data records keyed by
their `id` field; the registry holds the deserialized objects, not class
instances.

### RulesRegistry

Holds `RuleSetReference` pointers. Each reference names a rule module
under [src/simulator/rules/](../src/simulator/rules/); the implementation
stays in core, the plugin holds only the reference.

### UiRegistry

Three register entry points for tabs, panels, and widgets. Each
registration carries an `availableInPhase` predicate (and optional
`availableForAge`) plus a `render(ctx)` callback.

### LifecycleRegistry

Routes the three hook types described above.

### ActivityRegistry

`Activity` registry.

### DataPackRegistry

Generic registry for plugin-defined data bundles. Plugins choose the
payload shape for their own packs.

## Frozen contracts (M1)

The following contract surfaces in
[src/plugins/plugin_host.ts](../src/plugins/plugin_host.ts) are FROZEN as
of M1 and must not be mutated by later milestones without architect
approval. Current signatures:

```ts
interface PluginHost {
	phases: PhaseRegistry;
	events: EventRegistry;
	choices: ChoiceRegistry;
	rules: RulesRegistry;
	ui: UiRegistry;
	lifecycle: LifecycleRegistry;
	activities: ActivityRegistry;
	dataPacks: DataPackRegistry;
}

interface GamePlugin {
	name: string;
	version?: string;
	register(host: PluginHost): void;
}

interface AgeHook {
	id: string;
	age?: number;
	ageRange?: [number, number];
	condition?(player: Player): boolean;
	once?: boolean;
	priority?: number;
	fire(player: Player, ctx: GameContext): void;
}

interface PhaseStartHook {
	id: string;
	phase: CareerPhase;
	condition?(player: Player): boolean;
	priority?: number;
	fire(player: Player, ctx: GameContext): void;
}

interface CareerEndHook {
	id: string;
	trigger: 'retirement' | 'hof_eligibility' | 'forced_retirement';
	condition?(player: Player): boolean;
	priority?: number;
	fire(player: Player, ctx: GameContext): void;
}

interface TabRegistration {
	tabId: string;
	label: string;
	availableInPhase: (phase: CareerPhase) => boolean;
	availableForAge?: (age: number) => boolean;
	render(ctx: GameContext): void;
}

interface PanelRegistration {
	panelId: string;
	label: string;
	availableInPhase: (phase: CareerPhase) => boolean;
	availableForAge?: (age: number) => boolean;
	render(ctx: GameContext): void;
}

interface WidgetRegistration {
	widgetId: string;
	availableInPhase: (phase: CareerPhase) => boolean;
	availableForAge?: (age: number) => boolean;
	render(ctx: GameContext): void;
}
```

### Panel render contract

The `PanelRegistration.render(ctx: GameContext): void` signature is FROZEN.
Panels obtain the current player through `ctx.getPlayer()` (a getter method on
`GameContext`, which aliases `CareerContext`. See architect ruling 2026-05-20).
Panels mount and update DOM only inside their own
`src/plugins/<plugin>/panels/*.ts` module. This is the DOM-in-panels-only
rule: plugin entry modules (`src/plugins/<plugin>/index.ts`) and phase
handlers (`src/plugins/<plugin>/phase_handler.ts`) must not import DOM
APIs or `document.*`. DOM access is restricted to the panel render
callback body, which typically calls `document.getElementById(...)` for
its panel root before assembling content. The boundary is enforced by
[tests/check_dom_imports.ts](../tests/check_dom_imports.ts).

## How to write a plugin

The four-step recipe:

1. Define a `GamePlugin`: export a `myPlugin: GamePlugin` value from
   `src/plugins/<plugin_name>/index.ts` with `name`, optional `version`, and
   a `register(host)` method.
2. Inside `register(host)`, call the relevant sub-registries:
   `host.phases.register(...)`, `host.events.registerMany(...)`,
   `host.ui.registerPanel(...)`, etc. No business logic belongs in the host
   itself; all logic stays in the plugin's own modules.
3. Add one call to `register_plugins.ts`: append
   `myPlugin.register(host)` to
   [src/plugins/register_plugins.ts](../src/plugins/register_plugins.ts) so
   the plugin is wired in at boot.
4. Add a fixture test: drop a `tests/fixtures/plugins/<plugin_name>.ts`
   exporting the plugin, and assert from a TS test under `tests/` that
   registration succeeds and the expected entries appear in the registry
   `getAll()` output.

### Worked example: the high school plugin

The high school plugin is the M2 vertical-slice reference implementation
under [src/plugins/high_school/](../src/plugins/high_school/). It registers
the two HS phase handlers (frosh/soph for ages 14-15, varsity for ages
16-17) through `PluginHost` instead of through core's
`register_handlers.ts`.

Step 1: the `GamePlugin` entry module
([src/plugins/high_school/index.ts](../src/plugins/high_school/index.ts)).
It exports one `highSchoolPlugin` value and contains no DOM access and no
business logic; it only routes the call to a dedicated sibling module:

```ts
import type { GamePlugin, PluginHost } from '../plugin_host.js';
import { registerPhaseHandlers } from './phase_handler.js';

export const highSchoolPlugin: GamePlugin = {
	name: 'high_school',
	version: '0.1.0',

	register(host: PluginHost): void {
		registerPhaseHandlers(host);
	},
};
```

Step 2: the registration sibling
([src/plugins/high_school/phase_handler.ts](../src/plugins/high_school/phase_handler.ts))
that calls into the phase registry. The handler implementations themselves
still live under [src/high_school/](../src/high_school/) and are imported
by the plugin, keeping the plugin layer thin:

```ts
import type { PluginHost } from '../plugin_host.js';
import { hsFroshSophHandler } from '../../high_school/hs_frosh_soph.js';
import { hsVarsityHandler } from '../../high_school/hs_varsity.js';

export function registerPhaseHandlers(host: PluginHost): void {
	host.phases.register(hsFroshSophHandler);
	host.phases.register(hsVarsityHandler);
}
```

Step 3: the boot site wires the plugin once at startup via
[src/plugins/register_plugins.ts](../src/plugins/register_plugins.ts),
called from `main.ts` after core handler registration.

WP-M2-C and WP-M2-D extended this plugin with activities, tabs, panels,
events, and lifecycle hooks. All registrations land alongside the phase
handler in the plugin tree:

- `host.activities.registerMany(activities)` from
  `src/plugins/high_school/activities_loader.ts` (loads
  `src/plugins/high_school/activities.json`).
- `host.ui.registerTab({...})` from `src/plugins/high_school/tabs.ts`.
- `host.ui.registerPanel({ panelId, label, availableInPhase,
  render(ctx) { ... } })` from
  `src/plugins/high_school/panels/career_panel.ts`. The `render(ctx)`
  callback is the only place inside the plugin allowed to touch DOM (see
  the Panel render contract above).
- `host.events.registerMany(await loadHsEvents())` from
  `src/plugins/high_school/events_loader.ts` (loads
  `src/plugins/high_school/events/high_school.json`, moved into the
  plugin tree via `git mv`).
- `host.lifecycle.registerAgeHook(driversPermitHook)` and
  `host.lifecycle.registerPhaseStartHook(hsEntryHook)` from
  `src/plugins/high_school/lifecycle/hooks.ts`, sourcing the hooks from
  `lifecycle/drivers_permit.ts` (age 15) and `lifecycle/hs_entry.ts`
  (HS phase entry).

Arc-phase weekly choices (preseason, opening, midseason, stretch,
postseason) are intentionally NOT moved into the plugin tree. Per
architect decision (2026-05-21), choice JSON files remain shared across
all career phases under `src/data/choices/`; moving them into a single
phase plugin would fragment a cross-phase resource.

### Reference implementations

All four career-phase plugins (childhood, high_school, college, nfl) are
complete M3 reference implementations. Each plugin registers year handlers,
activities, tabs, panels, events, and lifecycle hooks for its career phase.
New phase-specific content should follow this pattern: create a folder under
`src/plugins/<phase_name>/`, export a `GamePlugin`, and call the host
registries within `register(host)`.

## Boundary rules

- No DOM access in plugin entry modules. DOM work belongs only in
  panel/widget render callbacks registered through
  [src/plugins/registries/ui_registry.ts](../src/plugins/registries/ui_registry.ts).
  This boundary is enforced by
  [tests/check_dom_imports.ts](../tests/check_dom_imports.ts).
- No cross-plugin imports. A plugin under `src/plugins/<a>/` must not import
  from `src/plugins/<b>/`. Shared logic moves up to
  [src/shared/](../src/shared/) or to a core module.
- Plugin registries must not import from phase folders
  ([src/childhood/](../src/childhood/), [src/high_school/](../src/high_school/),
  [src/college/](../src/college/), [src/nfl_handlers/](../src/nfl_handlers/))
  or from simulator implementation files under
  [src/simulator/](../src/simulator/). Registries route data, they do not
  reach into game systems.
- Core modules ([src/core/](../src/core/), [src/weekly/](../src/weekly/),
  [src/season/](../src/season/), [src/simulator/](../src/simulator/)) never
  import from `src/plugins/`. The dependency arrow points one way:
  plugins -> core.

## Related docs

- [CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md): high-level system design and
  the rest of the extension points.
- [FILE_STRUCTURE.md](FILE_STRUCTURE.md): directory map including the
  `src/plugins/` subtree.
- [TYPESCRIPT_STYLE.md](TYPESCRIPT_STYLE.md): TypeScript conventions plugins
  must follow.
