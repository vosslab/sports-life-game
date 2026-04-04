// activities.ts - activity definitions, effects, and action cap logic

import { Player, CareerPhase, CoreStats, modifyStat } from './player.js';

//============================================
// Activity definition
export interface Activity {
	id: string;
	name: string;
	description: string;
	// Which phases this activity is available in
	phases: CareerPhase[];
	// Stat effects: positive means gain, negative means cost
	effects: Record<string, number>;
	// Optional unlock condition (e.g., college year 2+)
	unlockCondition?: (player: Player) => boolean;
	// Unlock hint shown when activity is locked
	unlockHint?: string;
	// Flavor text shown after completing the activity
	flavorText: string;
}

export interface ActivityResult {
	flavorText: string;
	appliedEffects: Record<string, number>;
	moneyDelta: number;
}

//============================================
// Weekly state for the game loop (transient, not on Player)
export type WeekPhase = 'focus' | 'activity_prompt' | 'activity_done' | 'event' | 'game' | 'results';

export interface WeekState {
	phase: WeekPhase;
	actionsUsed: number;
	actionBudget: number;
}

//============================================
// Create a fresh week state (called at start of each week)
export function createWeekState(): WeekState {
	return {
		phase: 'focus',
		actionsUsed: 0,
		actionBudget: 1,
	};
}

//============================================
// Check if player can do an activity this week
export function canDoActivity(state: WeekState): boolean {
	// Activities only allowed during the activity_prompt phase
	if (state.phase !== 'activity_prompt') {
		return false;
	}
	// Check action cap
	return state.actionsUsed < state.actionBudget;
}

//============================================
// HIGH SCHOOL ACTIVITIES
// Each has a trade-off: no activity is strictly dominant every week
const HS_ACTIVITIES: Activity[] = [
	{
		id: 'hs_extra_practice',
		name: 'Extra Practice',
		description: 'Stay late and work on drills. Pushes your body.',
		phases: ['high_school'],
		effects: { technique: 2, health: -1 },
		flavorText: 'You stayed after practice. Your hands are sore but your routes are crisper.',
	},
	{
		id: 'hs_weight_room',
		name: 'Weight Room',
		description: 'Hit the weights. Builds strength but tiring.',
		phases: ['high_school'],
		effects: { athleticism: 2, health: -1 },
		flavorText: 'New personal record on the bench. Coach nodded approvingly.',
	},
	{
		id: 'hs_study_hall',
		name: 'Study Hall',
		description: 'Focus on academics. No football benefit this week.',
		phases: ['high_school'],
		effects: { discipline: 2 },
		flavorText: 'You aced the history test. Coach likes players who handle their business.',
	},
	{
		id: 'hs_hang_with_friends',
		name: 'Hang with Friends',
		description: 'Relax and have fun. Good for morale, not for focus.',
		phases: ['high_school'],
		effects: { confidence: 2, discipline: -1 },
		flavorText: 'Friday night with the crew. You needed that.',
	},
	{
		id: 'hs_rest_recover',
		name: 'Rest and Recover',
		description: 'Take it easy. Heals the body, but no stat gains.',
		phases: ['high_school'],
		effects: { health: 3 },
		flavorText: 'Full night of sleep, ice bath, and stretching. Body feels good.',
	},
];

//============================================
// COLLEGE ACTIVITIES
const COLLEGE_ACTIVITIES: Activity[] = [
	{
		id: 'col_position_drills',
		name: 'Position Drills',
		description: 'Intensive position-specific work. Tiring but effective.',
		phases: ['college'],
		effects: { technique: 3, health: -1 },
		flavorText: 'The position coach ran you through advanced drills. You feel sharper.',
	},
	{
		id: 'col_film_study',
		name: 'Film Study',
		description: 'Break down opponent film. Pure mental gain.',
		phases: ['college'],
		effects: { footballIq: 2 },
		flavorText: 'Two hours of film. You spotted three tendencies nobody else caught.',
	},
	{
		id: 'col_nil_meeting',
		name: 'NIL Meeting',
		description: 'Meet with a brand rep. Money but distracting.',
		phases: ['college'],
		effects: { discipline: -1 },
		unlockCondition: (player: Player) => player.collegeYear >= 2,
		unlockHint: 'Available in sophomore year',
		flavorText: 'Signed a local deal. Not huge money but it feels real.',
	},
	{
		id: 'col_team_bonding',
		name: 'Team Bonding',
		description: 'Hang with teammates. Good for chemistry.',
		phases: ['college'],
		effects: { confidence: 2 },
		flavorText: 'Team dinner at the local spot. The locker room feels tighter.',
	},
	{
		id: 'col_recovery',
		name: 'Recovery Session',
		description: 'Sports medicine and rest. No stat gains.',
		phases: ['college'],
		effects: { health: 3 },
		flavorText: 'Cold tub, stretching, and a nap. Your body thanks you.',
	},
];

//============================================
// NFL ACTIVITIES
const NFL_ACTIVITIES: Activity[] = [
	{
		id: 'nfl_advanced_training',
		name: 'Advanced Training',
		description: 'Work with a private coach. Intense but effective.',
		phases: ['nfl'],
		effects: { technique: 3, health: -1 },
		flavorText: 'Private session with a specialist. Details matter at this level.',
	},
	{
		id: 'nfl_film_breakdown',
		name: 'Film Breakdown',
		description: 'Deep dive into next opponent. Mental edge.',
		phases: ['nfl'],
		effects: { footballIq: 2 },
		flavorText: 'You found their weak spot. Told the coordinator. He smiled.',
	},
	{
		id: 'nfl_endorsement',
		name: 'Endorsement Deal',
		description: 'Shoot a commercial. Pays well but distracting.',
		phases: ['nfl'],
		effects: { discipline: -1 },
		flavorText: 'Camera crew all morning. Paycheck makes it worth it.',
	},
	{
		id: 'nfl_media',
		name: 'Media Appearance',
		description: 'Press conference or interview. Builds confidence but drains focus.',
		phases: ['nfl'],
		effects: { confidence: 2, discipline: -1 },
		flavorText: 'Reporters asked tough questions. You handled it with poise.',
	},
	{
		id: 'nfl_recovery',
		name: 'Recovery and Rehab',
		description: 'Professional recovery. Essential for longevity.',
		phases: ['nfl'],
		effects: { health: 3 },
		flavorText: 'Hyperbaric chamber, massage, and cryotherapy. You feel 22 again.',
	},
];

//============================================
// Get available activities for the current phase and player state
export function getActivitiesForPhase(phase: CareerPhase, player: Player): Activity[] {
	let activities: Activity[] = [];

	if (phase === 'high_school') {
		activities = HS_ACTIVITIES;
	} else if (phase === 'college') {
		activities = COLLEGE_ACTIVITIES;
	} else if (phase === 'nfl') {
		activities = NFL_ACTIVITIES;
	}

	return activities;
}

//============================================
// Check if a specific activity is unlocked for this player
export function isActivityUnlocked(activity: Activity, player: Player): boolean {
	if (!activity.unlockCondition) {
		// No condition means always unlocked
		return true;
	}
	return activity.unlockCondition(player);
}

//============================================
// Valid core stat keys for type-safe effect application
const CORE_STAT_KEYS: Set<string> = new Set([
	'athleticism', 'technique', 'footballIq', 'discipline', 'health', 'confidence',
]);

// Apply an activity's effects to the player and return the concrete changes
export function applyActivity(activity: Activity, player: Player): ActivityResult {
	const appliedEffects: Record<string, number> = {};

	// Apply each stat effect using the shared modifyStat function
	for (const [stat, delta] of Object.entries(activity.effects)) {
		if (CORE_STAT_KEYS.has(stat)) {
			modifyStat(player, stat as keyof CoreStats, delta);
			appliedEffects[stat] = delta;
		}
	}

	// Money rewards for specific activities
	let moneyDelta = 0;
	if (activity.id === 'col_nil_meeting') {
		const nilAmount = 500 + Math.floor(Math.random() * 2000);
		player.career.money += nilAmount;
		moneyDelta = nilAmount;
	}
	if (activity.id === 'nfl_endorsement') {
		const endorseAmount = 10000 + Math.floor(Math.random() * 50000);
		player.career.money += endorseAmount;
		moneyDelta = endorseAmount;
	}

	return {
		flavorText: activity.flavorText,
		appliedEffects,
		moneyDelta,
	};
}

//============================================
// Build effect preview string for display (e.g., "+2 TEC, -1 HP")
export function getEffectPreview(activity: Activity): string {
	const parts: string[] = [];
	const labels: Record<string, string> = {
		athleticism: 'ATH',
		technique: 'TEC',
		footballIq: 'IQ',
		discipline: 'DIS',
		health: 'HP',
		confidence: 'CON',
	};

	for (const [stat, delta] of Object.entries(activity.effects)) {
		const label = labels[stat];
		if (!label) {
			// Unknown stat key -- skip rather than silently display raw key
			continue;
		}
		const sign = delta > 0 ? '+' : '';
		parts.push(`${sign}${delta} ${label}`);
	}

	// Show money reward for activities that pay
	if (activity.id === 'col_nil_meeting') {
		parts.push('+$ NIL');
	}
	if (activity.id === 'nfl_endorsement') {
		parts.push('+$$$ endorsement');
	}

	return parts.join(', ');
}

//============================================
// Build a readable applied-effects string for the story log
export function formatActivityResult(result: ActivityResult): string {
	const parts: string[] = [];
	const labels: Record<string, string> = {
		athleticism: 'ATH',
		technique: 'TEC',
		footballIq: 'IQ',
		discipline: 'DIS',
		health: 'HP',
		confidence: 'CON',
	};

	for (const [stat, delta] of Object.entries(result.appliedEffects)) {
		const label = labels[stat];
		if (!label) {
			continue;
		}
		const sign = delta > 0 ? '+' : '';
		parts.push(`${sign}${delta} ${label}`);
	}

	if (result.moneyDelta > 0) {
		parts.push(`+$${result.moneyDelta.toLocaleString()}`);
	}

	return parts.join(', ');
}
