// activities_loader.ts - Load HS activities from JSON
//
// Activities are fetched at module load time (when imported) so that
// register() can use them synchronously. This ensures the plugin
// can register activities without requiring async registration.

import type { Activity } from '../../activities.js';

let loadedActivities: Activity[] | null = null;

export async function fetchHsActivities(): Promise<Activity[]> {
	const url = '/src/plugins/high_school/activities.json';
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to load HS activities from ${url}: ${response.status}`);
	}
	const hsActivities = (await response.json()) as Activity[];
	return hsActivities;
}

// Synchronous getter; activities are pre-loaded at plugin init time
export function loadHsActivities(): Activity[] {
	if (!loadedActivities) {
		throw new Error(
			'HS activities not yet loaded. Call preloadHsActivities() during bootstrap.'
		);
	}
	return loadedActivities;
}

// Called during async bootstrap to pre-load activities
export async function preloadHsActivities(): Promise<void> {
	loadedActivities = await fetchHsActivities();
}
