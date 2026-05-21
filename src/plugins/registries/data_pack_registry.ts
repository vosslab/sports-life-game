// data_pack_registry.ts - data pack registration with sub-item routing
//
// Registry for DataPack instances. When a pack is registered, its sub-items
// (events, choices, activities, lifecycleHooks) are automatically routed into
// their respective sub-registries.
//
// Route order: events -> choices -> activities -> lifecycle hooks.
// Throws on duplicate pack id. Sub-items throw if they conflict with existing ids.

import type { DataPack, DataPackRegistry, AgeHook, PhaseStartHook, CareerEndHook } from '../plugin_host.js';
import * as eventReg from './event_registry.js';
import * as choiceReg from './choice_registry.js';
import * as activityReg from './activity_registry.js';
import * as lifecycleReg from './lifecycle_registry.js';

//============================================
// Helper: discriminate lifecycle hook union by required field
function isAgeHook(hook: AgeHook | PhaseStartHook | CareerEndHook): hook is AgeHook {
	return 'age' in hook || 'ageRange' in hook;
}

// Discriminate PhaseStartHook by 'phase' field presence, excluding fields
// unique to AgeHook ('age'/'ageRange') and CareerEndHook ('trigger').
function isPhaseStartHook(hook: AgeHook | PhaseStartHook | CareerEndHook): hook is PhaseStartHook {
	return 'phase' in hook && !('age' in hook) && !('ageRange' in hook) && !('trigger' in hook);
}

function isCareerEndHook(hook: AgeHook | PhaseStartHook | CareerEndHook): hook is CareerEndHook {
	return 'trigger' in hook;
}

//============================================
// Module-level state: all registered data packs
const packs = new Map<string, DataPack>();

//============================================
// DataPackRegistry implementation: map-backed registry with routing

class DataPackRegistryImpl implements DataPackRegistry {
	register(pack: DataPack): void {
		if (packs.has(pack.id)) {
			throw new Error(
				`Duplicate data pack id: "${pack.id}" already registered in DataPackRegistry`
			);
		}

		// Route sub-items to their registries (order: events, choices, activities, lifecycle)
		if (pack.events) {
			eventReg.registerMany(pack.events);
		}

		if (pack.choices) {
			choiceReg.registerMany(pack.choices);
		}

		if (pack.activities) {
			activityReg.registerMany(pack.activities);
		}

		if (pack.lifecycleHooks) {
			for (const hook of pack.lifecycleHooks) {
				if (isAgeHook(hook)) {
					lifecycleReg.registerAgeHook(hook);
				} else if (isPhaseStartHook(hook)) {
					lifecycleReg.registerPhaseStartHook(hook);
				} else if (isCareerEndHook(hook)) {
					lifecycleReg.registerCareerEndHook(hook);
				}
			}
		}

		// Finally, register the pack itself
		packs.set(pack.id, pack);
	}

	lookup(id: string): DataPack | undefined {
		return packs.get(id);
	}

	getAll(): readonly DataPack[] {
		return Array.from(packs.values());
	}

	clear(): void {
		packs.clear();
	}
}

//============================================
// Module-level singleton instance
const instance = new DataPackRegistryImpl();

//============================================
// Public exports
export function register(pack: DataPack): void {
	instance.register(pack);
}

export function lookup(id: string): DataPack | undefined {
	return instance.lookup(id);
}

export function getAll(): readonly DataPack[] {
	return instance.getAll();
}

export function clear(): void {
	instance.clear();
}
