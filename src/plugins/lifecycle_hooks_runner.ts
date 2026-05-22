// lifecycle_hooks_runner.ts - utility to fire registered lifecycle hooks at appropriate times
//
// Provides functions to fire age hooks and phase start hooks based on player state.
// Called by handlers at appropriate points in the year flow.

import type { Player, CareerPhase } from '../player.js';
import type { CareerContext } from '../core/year_handler.js';
import {
	getAgeHooks,
	getPhaseStartHooks,
	getCareerEndHooks,
} from './registries/lifecycle_registry.js';

//============================================
// Fire all age hooks that match the player's current age (with once enforcement)
export function fireAgeHooks(player: Player, ctx: CareerContext): void {
	const ageHooks = getAgeHooks();

	for (const hook of ageHooks) {
		// Check if hook applies to this age
		if (!matchesAge(player.age, hook)) {
			continue;
		}

		// Check optional condition predicate
		if (hook.condition && !hook.condition(player)) {
			continue;
		}

		// Enforce once-idempotency. `once` defaults to true per AgeHook interface; only `once: false` opts out and fires every match.
		if (hook.once !== false) {
			const flagKey = `age_hook_fired_${hook.id}`;
			if (player.storyFlags[flagKey]) {
				// Hook has already fired; skip it
				continue;
			}
			// Mark hook as fired
			player.storyFlags[flagKey] = true;
		}

		// Fire the hook
		hook.fire(player, ctx);
	}
}

//============================================
// Fire all phase start hooks for the given phase (idempotent: fires only once per phase)
export function firePhaseStartHooks(phase: CareerPhase, player: Player, ctx: CareerContext): void {
	// Compute the flag key for this phase
	const flagKey = `phase_started_${phase}`;

	// If this phase has already fired its start hooks, return early (idempotent)
	if (player.storyFlags[flagKey]) {
		return;
	}

	// Mark this phase as having started (prevent duplicate fires)
	player.storyFlags[flagKey] = true;

	const phaseHooks = getPhaseStartHooks();

	for (const hook of phaseHooks) {
		// Check if hook applies to this phase
		if (hook.phase !== phase) {
			continue;
		}

		// Check optional condition predicate
		if (hook.condition && !hook.condition(player)) {
			continue;
		}

		// Fire the hook
		hook.fire(player, ctx);
	}
}

//============================================
// Fire all career end hooks that match the given trigger
export function fireCareerEndHooks(trigger: string, player: Player, ctx: CareerContext): void {
	const endHooks = getCareerEndHooks();

	for (const hook of endHooks) {
		// Check if hook applies to this trigger
		if (hook.trigger !== trigger) {
			continue;
		}

		// Check optional condition predicate
		if (hook.condition && !hook.condition(player)) {
			continue;
		}

		// Fire the hook
		hook.fire(player, ctx);
	}
}

//============================================
// Helper: check if a hook's age specification matches the player's age
function matchesAge(
	playerAge: number,
	hook: { age?: number; ageRange?: [number, number] }
): boolean {
	if (hook.age !== undefined) {
		return playerAge === hook.age;
	}
	if (hook.ageRange) {
		const [minAge, maxAge] = hook.ageRange;
		return playerAge >= minAge && playerAge <= maxAge;
	}
	// If neither is specified, the hook never fires
	return false;
}
