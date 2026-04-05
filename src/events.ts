// events.ts - event system with data-driven event cards and weighted selection

import { Player, CoreStats, clampStat } from './player.js';

//============================================
// Event choice with effects and story text
export interface EventChoice {
	text: string;
	effects: Record<string, number>;
	flavor: string;
	sets_flag?: string;
	clears_flag?: string;
	progress_flag?: string;
}

//============================================
// Event condition constraints
export interface EventConditions {
	min_age?: number;
	max_age?: number;
	min_week?: number;
	max_week?: number;
	min_college_year?: number;
	max_college_year?: number;
	positions?: string[];
	min_stats?: Record<string, number>;
	max_stats?: Record<string, number>;
	requires_flag?: string;
	excludes_flag?: string;
}

//============================================
// Main game event card
export interface GameEvent {
	id: string;
	title: string;
	description: string;
	phase: 'childhood' | 'youth' | 'high_school' | 'college' | 'nfl';
	tags: string[];
	weight: number;
	is_big_decision: boolean;
	conditions: EventConditions;
	choices: EventChoice[];
	event_category?: 'core' | 'social' | 'identity' | 'big_decision';
	family?: string;
}

//============================================
// Load events from per-phase JSON files and combine into one array
export async function loadEvents(): Promise<GameEvent[]> {
	const phases = [
		'childhood_1', 'childhood_2', 'childhood_3',
		'childhood_4', 'childhood_5', 'childhood_6',
		'childhood_7', 'childhood_8', 'childhood_9',
		'youth', 'high_school', 'college', 'nfl',
	];
	// Fetch all phase files in parallel
	const fetches = phases.map((phase) =>
		fetch(`src/data/events/${phase}.json`).then((r) => r.json())
	);
	const arrays: GameEvent[][] = await Promise.all(fetches);
	const events: GameEvent[] = arrays.flat();
	return events;
}

//============================================
// Filter events by phase, week, position, flags, and stat conditions
export function filterEvents(
	events: GameEvent[],
	phase: string,
	week: number,
	position: string | null,
	flags: Record<string, boolean>,
	stats: Record<string, number>,
	collegeYear?: number,
	age?: number,
): GameEvent[] {
	return events.filter((event) => {
		// Check phase match
		if (event.phase !== phase) {
			return false;
		}

		// Defensive: treat missing conditions as empty (no constraints)
		const conditions = event.conditions || {};

		// Check week range
		if (conditions.min_week !== undefined && week < conditions.min_week) {
			return false;
		}
		if (conditions.max_week !== undefined && week > conditions.max_week) {
			return false;
		}

		// Check college year range when present
		if (conditions.min_college_year !== undefined) {
			if (collegeYear === undefined || collegeYear < conditions.min_college_year) {
				return false;
			}
		}
		if (conditions.max_college_year !== undefined) {
			if (collegeYear === undefined || collegeYear > conditions.max_college_year) {
				return false;
			}
		}

		// Check age range
		if (conditions.min_age !== undefined) {
			if (age === undefined || age < conditions.min_age) {
				return false;
			}
		}
		if (conditions.max_age !== undefined) {
			if (age === undefined || age > conditions.max_age) {
				return false;
			}
		}

		// Check position (empty positions array means any position is OK)
		if (
			conditions.positions !== undefined &&
			conditions.positions.length > 0 &&
			!conditions.positions.includes(position || '')
		) {
			return false;
		}

		// Check minimum stats
		if (conditions.min_stats !== undefined) {
			for (const [stat, minVal] of Object.entries(conditions.min_stats)) {
				// Skip stat check if stat key doesn't exist in stats record
				if (!(stat in stats)) {
					continue;
				}
				if (stats[stat] < minVal) {
					return false;
				}
			}
		}

		// Check maximum stats
		if (conditions.max_stats !== undefined) {
			for (const [stat, maxVal] of Object.entries(conditions.max_stats)) {
				// Skip stat check if stat key doesn't exist in stats record
				if (!(stat in stats)) {
					continue;
				}
				if (stats[stat] > maxVal) {
					return false;
				}
			}
		}

		// Check required flag
		if (conditions.requires_flag !== undefined) {
			if (!flags[conditions.requires_flag]) {
				return false;
			}
		}

		// Check excluded flag: if flag is set, exclude this event
		if (conditions.excludes_flag !== undefined) {
			if (flags[conditions.excludes_flag]) {
				return false;
			}
		}



		return true;
	});
}

//============================================
// Select random event from eligible list using weighted selection
// Higher weight = more likely to be chosen. Returns null if no events.
export function selectEvent(eligible: GameEvent[]): GameEvent | null {
	if (eligible.length === 0) {
		return null;
	}

	// Calculate total weight
	const totalWeight = eligible.reduce((sum, event) => sum + event.weight, 0);

	// Pick random value from 0 to totalWeight
	let random = Math.random() * totalWeight;

	// Find event that corresponds to this random value
	for (const event of eligible) {
		random -= event.weight;
		if (random <= 0) {
			return event;
		}
	}

	// Fallback (should not happen if weights are positive)
	return eligible[0];
}

//============================================
// Select one event strictly from a specific category. Returns null if none match.
export function selectEventByCategory(
	eligible: GameEvent[],
	category: string,
): GameEvent | null {
	const filtered = eligible.filter(e => e.event_category === category);
	if (filtered.length === 0) {
		return null;
	}
	return selectEvent(filtered);
}

//============================================
// Apply event choice to player: modify stats, set/clear flags, return flavor
export function applyEventChoice(
	player: Player,
	choice: EventChoice
): string {
	// Apply stat effects to player
	for (const [statName, delta] of Object.entries(choice.effects)) {
		// Handle core stats
		if (
			statName === 'athleticism' ||
			statName === 'technique' ||
			statName === 'footballIq' ||
			statName === 'discipline' ||
			statName === 'health' ||
			statName === 'confidence'
		) {
			const oldValue = player.core[statName as keyof CoreStats];
			const newValue = clampStat(oldValue + delta);
			player.core[statName as keyof CoreStats] = newValue;
		}

		// Handle career stats
		if (statName === 'popularity') {
			player.career.popularity = clampStat(
				player.career.popularity + delta
			);
		}
		if (statName === 'money') {
			player.career.money = Math.max(0, player.career.money + delta);
		}

		// Handle hidden stats
		if (statName === 'leadership') {
			player.hidden.leadership = clampStat(
				player.hidden.leadership + delta
			);
		}
		if (statName === 'durability') {
			player.hidden.durability = clampStat(
				player.hidden.durability + delta
			);
		}

		// Warn if stat name does not match any known stat
		const knownStats = [
			'athleticism', 'technique', 'footballIq', 'discipline',
			'health', 'confidence', 'popularity', 'money',
			'leadership', 'durability',
		];
		if (!knownStats.includes(statName)) {
			console.warn(`Unknown stat name in event effect: "${statName}"`);
		}
	}

	// Set flag if specified
	if (choice.sets_flag !== undefined) {
		player.storyFlags[choice.sets_flag] = true;
	}

	// Clear flag if specified
	if (choice.clears_flag !== undefined) {
		player.storyFlags[choice.clears_flag] = false;
	}

	// Increment flag progress if specified
	if (choice.progress_flag !== undefined) {
		player.flagProgress[choice.progress_flag] = (player.flagProgress[choice.progress_flag] || 0) + 1;
	}

	// Return flavor text
	return choice.flavor;
}
