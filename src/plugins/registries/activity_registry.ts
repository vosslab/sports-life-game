// activity_registry.ts - activity registration
//
// Thin registry for Activity instances.
// Supports register (single), registerMany (batch), lookup (by id), getAll, clear.
// Throws on duplicate id registration.

import type { Activity } from '../../activities.js';
import type { ActivityRegistry } from '../plugin_host.js';

//============================================
// Module-level state: all registered activities
const activities = new Map<string, Activity>();

//============================================
// ActivityRegistry implementation: map-backed registry

class ActivityRegistryImpl implements ActivityRegistry {
	register(activity: Activity): void {
		if (activities.has(activity.id)) {
			throw new Error(
				`Duplicate activity id: "${activity.id}" already registered in ActivityRegistry`
			);
		}
		activities.set(activity.id, activity);
	}

	registerMany(acts: readonly Activity[]): void {
		for (const activity of acts) {
			this.register(activity);
		}
	}

	lookup(id: string): Activity | undefined {
		return activities.get(id);
	}

	getAll(): readonly Activity[] {
		return Array.from(activities.values());
	}

	clear(): void {
		activities.clear();
	}
}

//============================================
// Module-level singleton instance
const instance = new ActivityRegistryImpl();

//============================================
// Public exports
export function register(activity: Activity): void {
	instance.register(activity);
}

export function registerMany(acts: readonly Activity[]): void {
	instance.registerMany(acts);
}

export function lookup(id: string): Activity | undefined {
	return instance.lookup(id);
}

export function getAll(): readonly Activity[] {
	return instance.getAll();
}

export function clear(): void {
	instance.clear();
}
