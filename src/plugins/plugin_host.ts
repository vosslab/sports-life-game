// plugin_host.ts - PluginHost facade and contract interfaces
//
// The central plugin registration API. This file defines the contract surfaces
// that plugins use to register handlers, events, choices, UI, and lifecycle hooks.
//
// Model: src/core/year_registry.ts and src/core/year_handler.ts
// Thin-host rule: PluginHost and registries contain zero business logic.
// They route registration calls and dispatch lookups only.
//
// Dependency rule: this file imports only types from src/player.ts,
// src/core/year_handler.ts, src/core/game_context.ts, and stdlib.
// No UI imports, no phase imports, no simulator imports.

import type { Player, CareerPhase } from '../player.js';
import type { YearHandler } from '../core/year_handler.js';
import type { GameContext } from '../core/game_context.js';
import type { GameEvent } from '../events.js';
import type { WeeklyChoice } from '../weekly/choices.js';
import type { Activity } from '../activities.js';

//============================================
// Lifecycle hooks: three separate contracts, not one umbrella AgeHook

export interface AgeHook {
	id: string;
	age?: number; // exact age to fire at
	ageRange?: [number, number]; // [minAge, maxAge] inclusive range
	condition?(player: Player): boolean; // optional predicate
	once?: boolean; // default true; if false, fires every time condition met
	priority?: number; // deterministic ordering when multiple fire same age
	fire(player: Player, ctx: GameContext): void;
}

export interface PhaseStartHook {
	id: string;
	phase: CareerPhase; // e.g., 'nfl' for draft-day hooks
	condition?(player: Player): boolean; // optional predicate
	priority?: number; // deterministic ordering when multiple fire same phase
	fire(player: Player, ctx: GameContext): void;
}

export interface CareerEndHook {
	id: string;
	trigger: 'retirement' | 'hof_eligibility' | 'forced_retirement';
	condition?(player: Player): boolean; // optional predicate
	priority?: number; // deterministic ordering
	fire(player: Player, ctx: GameContext): void;
}

//============================================
// Registry interfaces: each registry exposes register, lookup, getAll, clear

export interface PhaseRegistry {
	register(handler: YearHandler): void;
	lookup(id: string): YearHandler | undefined;
	getAll(): readonly YearHandler[];
	clear(): void;
}

export interface EventRegistry {
	register(event: GameEvent): void;
	registerMany(events: readonly GameEvent[]): void;
	lookup(id: string): GameEvent | undefined;
	getAll(): readonly GameEvent[];
	clear(): void;
}

export interface ChoiceRegistry {
	register(choice: WeeklyChoice): void;
	registerMany(choices: readonly WeeklyChoice[]): void;
	lookup(id: string): WeeklyChoice | undefined;
	getAll(): readonly WeeklyChoice[];
	clear(): void;
}

export interface RulesRegistry {
	register(ruleSetRef: RuleSetReference): void;
	lookup(id: string): RuleSetReference | undefined;
	getAll(): readonly RuleSetReference[];
	clear(): void;
}

export interface RuleSetReference {
	id: string;
	name: string;
	// Implementation stays in src/simulator/rules/*.ts (core); plugin only holds reference.
	implementationModule?: string; // e.g., 'src/simulator/rules/ihsa_rules.ts'
}

export interface UiRegistry {
	registerTab(config: TabRegistration): void;
	registerPanel(config: PanelRegistration): void;
	registerWidget(config: WidgetRegistration): void;
	getAllTabs(): readonly TabRegistration[];
	getAllPanels(): readonly PanelRegistration[];
	getAllWidgets(): readonly WidgetRegistration[];
	clear(): void;
}

export interface TabRegistration {
	tabId: string;
	label: string;
	availableInPhase: (phase: CareerPhase) => boolean;
	availableForAge?: (age: number) => boolean;
	render(ctx: GameContext): void;
}

export interface PanelRegistration {
	panelId: string;
	label: string;
	availableInPhase: (phase: CareerPhase) => boolean;
	availableForAge?: (age: number) => boolean;
	render(ctx: GameContext): void;
}

export interface WidgetRegistration {
	widgetId: string;
	availableInPhase: (phase: CareerPhase) => boolean;
	availableForAge?: (age: number) => boolean;
	render(ctx: GameContext): void;
}

export interface LifecycleRegistry {
	registerAgeHook(hook: AgeHook): void;
	registerPhaseStartHook(hook: PhaseStartHook): void;
	registerCareerEndHook(hook: CareerEndHook): void;
	getAgeHooks(): readonly AgeHook[];
	getPhaseStartHooks(): readonly PhaseStartHook[];
	getCareerEndHooks(): readonly CareerEndHook[];
	clear(): void;
}

export interface ActivityRegistry {
	register(activity: Activity): void;
	registerMany(activities: readonly Activity[]): void;
	lookup(id: string): Activity | undefined;
	getAll(): readonly Activity[];
	clear(): void;
}

export interface DataPackRegistry {
	register(pack: DataPack): void;
	lookup(id: string): DataPack | undefined;
	getAll(): readonly DataPack[];
	clear(): void;
}

export interface DataPack {
	id: string;
	name: string;
	description?: string;
	version?: string;
	// Optional sub-items: when a pack is registered, these are routed into
	// their respective registries (events -> event_registry, etc).
	events?: readonly GameEvent[];
	choices?: readonly WeeklyChoice[];
	activities?: readonly Activity[];
	// Lifecycle hooks: single array with discriminated union by required field.
	// - AgeHook: has 'age' or 'ageRange'
	// - PhaseStartHook: has 'phase' (required)
	// - CareerEndHook: has 'trigger' (required)
	lifecycleHooks?: readonly (AgeHook | PhaseStartHook | CareerEndHook)[];
}

//============================================
// PluginHost: the central facade
//
// Plugins call host.phases.register(...), host.events.registerMany(...),
// etc. to register their content. The host routes calls to underlying
// registry implementations.

export interface PluginHost {
	phases: PhaseRegistry;
	events: EventRegistry;
	choices: ChoiceRegistry;
	rules: RulesRegistry;
	ui: UiRegistry;
	lifecycle: LifecycleRegistry;
	activities: ActivityRegistry;
	dataPacks: DataPackRegistry;
}

//============================================
// GamePlugin: the contract each plugin implements
//
// Plugins export one GamePlugin instance and call host.register(plugin)
// at app boot (in src/plugins/register_plugins.ts).

export interface GamePlugin {
	name: string; // unique id; duplicate registration throws
	version?: string; // optional semver for diagnostics
	register(host: PluginHost): void;
}
