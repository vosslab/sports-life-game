// events_loader.ts - Load college events from JSON
//
// Events are fetched at module load time (when imported) so that
// register() can use them synchronously. This ensures the plugin
// can register events without requiring async registration.

import type { GameEvent } from '../../events.js';

let loadedEvents: GameEvent[] | null = null;

export async function fetchCollegeEvents(): Promise<GameEvent[]> {
	const url = '/src/plugins/college/events/college.json';
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to load college events from ${url}: ${response.status}`);
	}
	const collegeEvents = (await response.json()) as GameEvent[];
	return collegeEvents;
}

// Synchronous getter; events are pre-loaded at plugin init time
export function loadCollegeEvents(): GameEvent[] {
	if (!loadedEvents) {
		throw new Error(
			'College events not yet loaded. Call preloadCollegeEvents() during bootstrap.'
		);
	}
	return loadedEvents;
}

// Called during async bootstrap to pre-load events
export async function preloadCollegeEvents(): Promise<void> {
	loadedEvents = await fetchCollegeEvents();
}
