// activities_loader.ts - Load childhood activities from JSON
//
// Activities are fetched at module load time (when imported) so that
// register() can use them synchronously. This ensures the plugin
// can register activities without requiring async registration.

import type { Activity } from '../../activities.js';

let loadedActivities: Activity[] | null = null;

export async function fetchChildhoodActivities(): Promise<Activity[]> {
	const url = '/src/plugins/childhood/activities.json';
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to load childhood activities from ${url}: ${response.status}`);
	}
	const childhoodActivities = (await response.json()) as Activity[];
	return childhoodActivities;
}

// Synchronous getter; activities are pre-loaded at plugin init time
export function loadChildhoodActivities(): Activity[] {
	if (!loadedActivities) {
		throw new Error(
			'Childhood activities not yet loaded. Call preloadChildhoodActivities() during bootstrap.'
		);
	}
	return loadedActivities;
}

// Called during async bootstrap to pre-load activities
export async function preloadChildhoodActivities(): Promise<void> {
	loadedActivities = await fetchChildhoodActivities();
}
