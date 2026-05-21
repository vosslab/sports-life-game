// lifecycle_registry.ts - lifecycle hook registration
//
// Thin registry for AgeHook, PhaseStartHook, and CareerEndHook.
// Three separate registration methods with stable ordering by (priority desc, id asc).
// Lookup methods: getAgeHooks, getPhaseStartHooks, getCareerEndHooks.
// Throws on duplicate id within each hook type.

import type {
	AgeHook,
	PhaseStartHook,
	CareerEndHook,
	LifecycleRegistry,
} from '../plugin_host.js';

//============================================
// Module-level state: separate arrays for each hook type
const ageHooks: AgeHook[] = [];
const phaseStartHooks: PhaseStartHook[] = [];
const careerEndHooks: CareerEndHook[] = [];

//============================================
// Helper: sort by priority desc, then id asc.
// Higher priority number fires FIRST. Default priority is 0.
// Use priority > 0 to ensure a hook fires before others at the same age.
function sortHooks<T extends { id: string; priority?: number }>(
	hooks: T[]
): void {
	hooks.sort((a, b) => {
		const priorityA = a.priority ?? 0;
		const priorityB = b.priority ?? 0;
		if (priorityA !== priorityB) {
			return priorityB - priorityA; // desc
		}
		return a.id.localeCompare(b.id); // asc
	});
}

//============================================
// LifecycleRegistry implementation: separate arrays per hook type

class LifecycleRegistryImpl implements LifecycleRegistry {
	registerAgeHook(hook: AgeHook): void {
		// Validate no duplicate id
		for (const existing of ageHooks) {
			if (existing.id === hook.id) {
				throw new Error(
					`Duplicate age hook id: "${hook.id}" already registered in LifecycleRegistry`
				);
			}
		}
		ageHooks.push(hook);
		sortHooks(ageHooks);
	}

	registerPhaseStartHook(hook: PhaseStartHook): void {
		// Validate no duplicate id
		for (const existing of phaseStartHooks) {
			if (existing.id === hook.id) {
				throw new Error(
					`Duplicate phase start hook id: "${hook.id}" already registered in LifecycleRegistry`
				);
			}
		}
		phaseStartHooks.push(hook);
		sortHooks(phaseStartHooks);
	}

	registerCareerEndHook(hook: CareerEndHook): void {
		// Validate no duplicate id
		for (const existing of careerEndHooks) {
			if (existing.id === hook.id) {
				throw new Error(
					`Duplicate career end hook id: "${hook.id}" already registered in LifecycleRegistry`
				);
			}
		}
		careerEndHooks.push(hook);
		sortHooks(careerEndHooks);
	}

	getAgeHooks(): readonly AgeHook[] {
		return ageHooks;
	}

	getPhaseStartHooks(): readonly PhaseStartHook[] {
		return phaseStartHooks;
	}

	getCareerEndHooks(): readonly CareerEndHook[] {
		return careerEndHooks;
	}

	clear(): void {
		ageHooks.length = 0;
		phaseStartHooks.length = 0;
		careerEndHooks.length = 0;
	}
}

//============================================
// Module-level singleton instance
const instance = new LifecycleRegistryImpl();

//============================================
// Public exports
export function registerAgeHook(hook: AgeHook): void {
	instance.registerAgeHook(hook);
}

export function registerPhaseStartHook(hook: PhaseStartHook): void {
	instance.registerPhaseStartHook(hook);
}

export function registerCareerEndHook(hook: CareerEndHook): void {
	instance.registerCareerEndHook(hook);
}

export function getAgeHooks(): readonly AgeHook[] {
	return instance.getAgeHooks();
}

export function getPhaseStartHooks(): readonly PhaseStartHook[] {
	return instance.getPhaseStartHooks();
}

export function getCareerEndHooks(): readonly CareerEndHook[] {
	return instance.getCareerEndHooks();
}

export function clear(): void {
	instance.clear();
}
