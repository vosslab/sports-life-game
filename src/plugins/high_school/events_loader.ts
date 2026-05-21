// events_loader.ts - Load HS events from JSON
//
// Events are fetched at module load time (when imported) so that
// register() can use them synchronously. This ensures the plugin
// can register events without requiring async registration.

import type { GameEvent } from '../../events.js';

let loadedEvents: GameEvent[] | null = null;

export async function fetchHsEvents(): Promise<GameEvent[]> {
	const url = '/src/plugins/high_school/events/high_school.json';
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to load HS events from ${url}: ${response.status}`);
	}
	const hsEvents = (await response.json()) as GameEvent[];
	return hsEvents;
}

// Synchronous getter; events are pre-loaded at plugin init time
export function loadHsEvents(): GameEvent[] {
	if (!loadedEvents) {
		throw new Error(
			'HS events not yet loaded. Call preloadHsEvents() during bootstrap.'
		);
	}
	return loadedEvents;
}

// Called during async bootstrap to pre-load events
export async function preloadHsEvents(): Promise<void> {
	loadedEvents = await fetchHsEvents();
}
