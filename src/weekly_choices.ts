// weekly_choices.ts - adaptive weekly choice generation
//
// Replaces static activity selection with context-sensitive choices
// that have real stakes and uncertain outcomes.

import { Player, modifyStat, clampStat, randomInRange } from './player.js';
import { ArcPhase } from './season_arc.js';

//============================================
// Choice data loaded from JSON
export interface ChoiceOutcome {
	probability: number;
	effects: Record<string, number>;
	narrative: string;
}

export interface WeeklyChoice {
	id: string;
	category: string;
	text: string;
	description: string;
	risk: string;
	conditions: Record<string, unknown>;
	outcomes: {
		success: ChoiceOutcome;
		failure: ChoiceOutcome;
	};
}

//============================================
// Result of resolving a choice
export interface ChoiceResult {
	choiceId: string;
	succeeded: boolean;
	narrative: string;
	effects: Record<string, number>;
}

//============================================
// Choice pools loaded from JSON (populated by loadChoicePools)
const choicePools: Record<ArcPhase, WeeklyChoice[]> = {
	preseason: [],
	opening: [],
	midseason: [],
	stretch: [],
	postseason: [],
};

//============================================
// Load choice pools from imported JSON data
export function loadChoicePools(data: Record<ArcPhase, WeeklyChoice[]>): void {
	for (const phase of Object.keys(data) as ArcPhase[]) {
		choicePools[phase] = data[phase];
	}
}

//============================================
// Get available choices for this week based on context
export function getWeeklyChoices(
	player: Player,
	arcPhase: ArcPhase,
	recentWins: number,
	recentLosses: number,
	hasCrisis: boolean,
): WeeklyChoice[] {
	// During a crisis, choices come from the crisis system, not here
	if (hasCrisis) {
		return [];
	}

	const pool = choicePools[arcPhase];
	if (pool.length === 0) {
		return [];
	}

	// Filter by conditions
	const eligible = pool.filter(choice => meetsConditions(choice, player));

	// Pick 3 choices (or fewer if pool is small): aim for variety in category
	const selected: WeeklyChoice[] = [];
	const usedCategories = new Set<string>();

	// First pass: one per category
	for (const choice of eligible) {
		if (selected.length >= 3) {
			break;
		}
		if (!usedCategories.has(choice.category)) {
			selected.push(choice);
			usedCategories.add(choice.category);
		}
	}

	// Second pass: fill remaining slots
	for (const choice of eligible) {
		if (selected.length >= 3) {
			break;
		}
		if (!selected.includes(choice)) {
			selected.push(choice);
		}
	}

	return selected;
}

//============================================
// Check if a choice's conditions are met
function meetsConditions(choice: WeeklyChoice, player: Player): boolean {
	const conds = choice.conditions;

	// Depth chart condition
	if (conds.depthChart) {
		const allowed = conds.depthChart as string[];
		if (!allowed.includes(player.depthChart)) {
			return false;
		}
	}

	// Health threshold condition
	if (conds.healthBelow !== undefined) {
		if (player.core.health >= (conds.healthBelow as number)) {
			return false;
		}
	}

	return true;
}

//============================================
// Resolve a player's choice: roll success/failure and apply effects
export function resolveChoice(
	player: Player,
	choice: WeeklyChoice,
): ChoiceResult {
	const roll = Math.random();
	const succeeded = roll < choice.outcomes.success.probability;

	const outcome = succeeded ? choice.outcomes.success : choice.outcomes.failure;

	// Apply stat effects
	for (const [stat, delta] of Object.entries(outcome.effects)) {
		if (stat === 'health' || stat === 'confidence' || stat === 'technique'
			|| stat === 'athleticism' || stat === 'footballIq' || stat === 'discipline') {
			modifyStat(player, stat as keyof typeof player.core, delta);
		}
	}

	return {
		choiceId: choice.id,
		succeeded,
		narrative: outcome.narrative,
		effects: outcome.effects,
	};
}
