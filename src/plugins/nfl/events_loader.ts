// nfl/events_loader.ts - Load NFL events from events/nfl.json
//
// Preloaded during bootstrap before registerAllPlugins().

import type { GameEvent } from '../../events.js';

// Inline NFL events data (matching structure from events/nfl.json)
const nflEventsJson: GameEvent[] = [
	{
		id: 'nfl_veteran_advice',
		title: 'Veteran Gives You the Talk',
		description: 'A 10-year vet pulls you aside in the locker room. He wants to give you some real advice.',
		phase: 'nfl',
		tags: ['locker_room', 'leadership'],
		weight: 6,
		is_big_decision: false,
		conditions: {},
		choices: [
			{
				text: 'Listen closely, take it to heart',
				effects: { discipline: 2, footballIq: 1, leadership: 1 },
				flavor: 'His wisdom shapes your rookie year. You avoid rookie mistakes.',
			},
			{
				text: 'Thank him but do your own thing',
				effects: { confidence: 1, athleticism: 1 },
				flavor: 'You\'ve got your own style. You learn the hard way instead.',
			},
		],
	},
	{
		id: 'nfl_rookie_mentoring',
		title: 'Young Rookie Asks for Help',
		description: 'A lost-looking rookie approaches you for advice in the facility.',
		phase: 'nfl',
		tags: ['locker_room', 'leadership'],
		weight: 5,
		is_big_decision: false,
		conditions: {},
		choices: [
			{
				text: 'Mentor him, help him acclimate',
				effects: { leadership: 2, confidence: 1 },
				flavor: 'You remember what it was like. Feels good to give back.',
			},
			{
				text: 'Keep your distance, focus on yourself',
				effects: { discipline: 1 },
				flavor: 'You were nice, but you\'ve got your own game to worry about.',
			},
		],
	},
];

// Preloaded during bootstrap
let cachedEvents: GameEvent[] | null = null;

//============================================
export function preloadNflEvents(): GameEvent[] {
	if (cachedEvents) {
		return cachedEvents;
	}

	// nflEventsJson comes from nfl.json import
	cachedEvents = nflEventsJson as GameEvent[];
	return cachedEvents;
}

//============================================
export function loadNflEvents(): GameEvent[] {
	const cached = preloadNflEvents();
	return [...cached];
}
