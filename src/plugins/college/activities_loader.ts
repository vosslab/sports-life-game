// activities_loader.ts - Load college activities from JSON
//
// Activities are fetched at module load time (when imported) so that
// register() can use them synchronously. This ensures the plugin
// can register activities without requiring async registration.

import type { Activity } from '../../activities.js';

let loadedActivities: Activity[] | null = null;

export async function fetchCollegeActivities(): Promise<Activity[]> {
	const url = '/src/plugins/college/activities.json';
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to load college activities from ${url}: ${response.status}`);
	}
	const collegeActivities = (await response.json()) as Activity[];
	return collegeActivities;
}

// Synchronous getter; activities are pre-loaded at plugin init time
export function loadCollegeActivities(): Activity[] {
	if (!loadedActivities) {
		throw new Error(
			'College activities not yet loaded. Call preloadCollegeActivities() during bootstrap.'
		);
	}
	return loadedActivities;
}

// Called during async bootstrap to pre-load activities
export async function preloadCollegeActivities(): Promise<void> {
	loadedActivities = await fetchCollegeActivities();
}
