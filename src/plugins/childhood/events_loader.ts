// events_loader.ts - Load childhood events from JSON
//
// Events are fetched at module load time (when imported) so that
// register() can use them synchronously. This ensures the plugin
// can register events without requiring async registration.

import type { GameEvent } from '../../events.js';

let loadedEvents: GameEvent[] | null = null;

export async function fetchChildhoodEvents(): Promise<GameEvent[]> {
	const url = '/src/plugins/childhood/events/childhood.json';
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to load childhood events from ${url}: ${response.status}`);
	}
	const childhoodEvents = (await response.json()) as GameEvent[];
	return childhoodEvents;
}

// Synchronous getter; events are pre-loaded at plugin init time
export function loadChildhoodEvents(): GameEvent[] {
	if (!loadedEvents) {
		throw new Error(
			'Childhood events not yet loaded. Call preloadChildhoodEvents() during bootstrap.'
		);
	}
	return loadedEvents;
}

// Called during async bootstrap to pre-load events
export async function preloadChildhoodEvents(): Promise<void> {
	loadedEvents = await fetchChildhoodEvents();
}
