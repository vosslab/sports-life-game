// activities_loader.ts - Load college activities from JSON
//
// Activities are imported at bundle time by esbuild (resolveJsonModule),
// so the data is available synchronously without any preload step.

import type { Activity } from '../../activities.js';
import activitiesData from './activities.json';

// Cast through unknown: inferred JSON literal types are too narrow for Activity[].
const collegeActivities = activitiesData as unknown as Activity[];

// Synchronous getter; data is resolved at import time
export function loadCollegeActivities(): Activity[] {
	return collegeActivities;
}
