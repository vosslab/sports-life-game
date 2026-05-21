// build_host.ts - construct the PluginHost from registry modules
//
// Pure factory function that wires eight thin registries into a PluginHost.
// Each registry module exports named functions (register, lookup, getAll, clear);
// this factory adapts those functions to the registry interface's methods.
//
// Design: zero business logic, zero state ownership. The host is a mere facade
// that routes plugin calls to underlying registries. Each registry owns its data.

import type { PluginHost } from './plugin_host.js';
import {
	register as registerPhase,
	lookup as lookupPhase,
	getAll as getAllPhases,
	clear as clearPhases,
} from './registries/phase_registry.js';
import {
	register as registerEvent,
	registerMany as registerManyEvents,
	lookup as lookupEvent,
	getAll as getAllEvents,
	clear as clearEvents,
} from './registries/event_registry.js';
import {
	register as registerChoice,
	registerMany as registerManyChoices,
	lookup as lookupChoice,
	getAll as getAllChoices,
	clear as clearChoices,
} from './registries/choice_registry.js';
import {
	register as registerRules,
	lookup as lookupRules,
	getAll as getAllRules,
	clear as clearRules,
} from './registries/rules_registry.js';
import {
	registerTab,
	registerPanel,
	registerWidget,
	getAllTabs,
	getAllPanels,
	getAllWidgets,
	clear as clearUI,
} from './registries/ui_registry.js';
import {
	registerAgeHook,
	registerPhaseStartHook,
	registerCareerEndHook,
	getAgeHooks,
	getPhaseStartHooks,
	getCareerEndHooks,
	clear as clearLifecycle,
} from './registries/lifecycle_registry.js';
import {
	register as registerActivity,
	registerMany as registerManyActivities,
	lookup as lookupActivity,
	getAll as getAllActivities,
	clear as clearActivities,
} from './registries/activity_registry.js';
import {
	register as registerDataPack,
	lookup as lookupDataPack,
	getAll as getAllDataPacks,
	clear as clearDataPacks,
} from './registries/data_pack_registry.js';

//============================================
export function buildPluginHost(): PluginHost {
	return {
		phases: {
			register: registerPhase,
			lookup: lookupPhase,
			getAll: getAllPhases,
			clear: clearPhases,
		},
		events: {
			register: registerEvent,
			registerMany: registerManyEvents,
			lookup: lookupEvent,
			getAll: getAllEvents,
			clear: clearEvents,
		},
		choices: {
			register: registerChoice,
			registerMany: registerManyChoices,
			lookup: lookupChoice,
			getAll: getAllChoices,
			clear: clearChoices,
		},
		rules: {
			register: registerRules,
			lookup: lookupRules,
			getAll: getAllRules,
			clear: clearRules,
		},
		ui: {
			registerTab,
			registerPanel,
			registerWidget,
			getAllTabs,
			getAllPanels,
			getAllWidgets,
			clear: clearUI,
		},
		lifecycle: {
			registerAgeHook,
			registerPhaseStartHook,
			registerCareerEndHook,
			getAgeHooks,
			getPhaseStartHooks,
			getCareerEndHooks,
			clear: clearLifecycle,
		},
		activities: {
			register: registerActivity,
			registerMany: registerManyActivities,
			lookup: lookupActivity,
			getAll: getAllActivities,
			clear: clearActivities,
		},
		dataPacks: {
			register: registerDataPack,
			lookup: lookupDataPack,
			getAll: getAllDataPacks,
			clear: clearDataPacks,
		},
	};
}
