// crisis.ts - midseason crisis system
//
// 0-2 crises per season during midseason arc phase.
// Each crisis replaces the normal weekly choice for its duration.

import { Player, modifyStat, randomInRange } from './player.js';

//============================================
// Crisis data types
export interface CrisisResponse {
	id: string;
	text: string;
	risk: string;
	effects: Record<string, number>;
	narrative: string;
	depthChartChange: string | null;
	missGames: number;
}

export interface CrisisDefinition {
	id: string;
	name: string;
	description: string;
	duration: number;
	triggerWeight: Record<string, number>;
	responses: CrisisResponse[];
}

//============================================
// Active crisis state (stored on player during crisis)
export interface ActiveCrisis {
	crisisId: string;
	name: string;
	description: string;
	weeksRemaining: number;
	resolved: boolean;
	responseId: string | null;
	missGamesRemaining: number;
}

//============================================
// All crisis definitions (loaded from JSON)
let crisisDefinitions: CrisisDefinition[] = [];

export function loadCrisisDefinitions(data: CrisisDefinition[]): void {
	crisisDefinitions = data;
}

//============================================
// Decide whether to trigger a crisis this season.
// Called once at start of midseason arc phase.
// Returns 0, 1, or 2 crisis IDs to schedule.
export function scheduleCrises(
	player: Player,
	recentLosses: number,
): string[] {
	// 70% chance of 1 crisis, 20% chance of 2, 10% chance of 0
	const roll = Math.random();
	let count = 0;
	if (roll < 0.10) {
		count = 0;
	} else if (roll < 0.80) {
		count = 1;
	} else {
		count = 2;
	}

	if (count === 0 || crisisDefinitions.length === 0) {
		return [];
	}

	// Weight crises by context
	const weighted = crisisDefinitions.map(def => {
		let weight = def.triggerWeight.base ?? 1.0;
		// Injury more likely when health is low
		if (def.triggerWeight.healthBelow50Bonus && player.core.health < 50) {
			weight += def.triggerWeight.healthBelow50Bonus;
		}
		// Depth chart shakeup more likely for bench/backup
		if (def.triggerWeight.benchBackupBonus
			&& (player.depthChart === 'bench' || player.depthChart === 'backup')) {
			weight += def.triggerWeight.benchBackupBonus;
		}
		// Locker room conflict more likely on losing streak
		if (def.triggerWeight.losingStreakBonus && recentLosses >= 3) {
			weight += def.triggerWeight.losingStreakBonus;
		}
		// Rival emergence more likely for winning starters
		if (def.triggerWeight.starterWinningBonus && player.depthChart === 'starter') {
			weight += def.triggerWeight.starterWinningBonus;
		}
		return { id: def.id, weight };
	});

	// Weighted random selection
	const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
	const selected: string[] = [];
	for (let i = 0; i < count; i++) {
		let pick = Math.random() * totalWeight;
		for (const entry of weighted) {
			pick -= entry.weight;
			if (pick <= 0) {
				if (!selected.includes(entry.id)) {
					selected.push(entry.id);
				}
				break;
			}
		}
	}

	return selected;
}

//============================================
// Start a crisis for the player
export function startCrisis(crisisId: string): ActiveCrisis | null {
	const def = crisisDefinitions.find(d => d.id === crisisId);
	if (!def) {
		return null;
	}

	return {
		crisisId: def.id,
		name: def.name,
		description: def.description,
		weeksRemaining: def.duration,
		resolved: false,
		responseId: null,
		missGamesRemaining: 0,
	};
}

//============================================
// Get crisis response options for display
export function getCrisisResponses(crisisId: string): CrisisResponse[] {
	const def = crisisDefinitions.find(d => d.id === crisisId);
	if (!def) {
		return [];
	}
	return def.responses;
}

//============================================
// Resolve the player's crisis response
export function resolveCrisisResponse(
	player: Player,
	crisis: ActiveCrisis,
	responseId: string,
): string {
	const def = crisisDefinitions.find(d => d.id === crisis.crisisId);
	if (!def) {
		return "Crisis resolved.";
	}

	const response = def.responses.find(r => r.id === responseId);
	if (!response) {
		return "Crisis resolved.";
	}

	// Apply effects
	for (const [stat, delta] of Object.entries(response.effects)) {
		if (stat === 'health' || stat === 'confidence' || stat === 'technique'
			|| stat === 'athleticism' || stat === 'footballIq' || stat === 'discipline') {
			modifyStat(player, stat as keyof typeof player.core, delta);
		}
	}

	// Track response
	crisis.responseId = responseId;
	crisis.resolved = true;
	crisis.missGamesRemaining = response.missGames;

	// Depth chart change
	if (response.depthChartChange === 'promote') {
		if (player.depthChart === 'bench') {
			player.depthChart = 'backup';
		} else if (player.depthChart === 'backup') {
			player.depthChart = 'starter';
		}
	}

	return response.narrative;
}

//============================================
// Advance the crisis by one week (called each week during active crisis)
export function advanceCrisis(crisis: ActiveCrisis): boolean {
	crisis.weeksRemaining -= 1;
	if (crisis.missGamesRemaining > 0) {
		crisis.missGamesRemaining -= 1;
	}
	// Return true if crisis is now over
	return crisis.weeksRemaining <= 0;
}
