// activities_loader.ts - Load childhood activities from JSON
//
// Activities are imported at bundle time by esbuild (resolveJsonModule),
// so the data is available synchronously without any preload step.

import type { Activity } from "../../activities.js";
import activitiesData from "./activities.json";

// Cast through unknown: the inferred JSON type uses narrow literals and
// "exactly these keys" effect objects, which TS won't directly assign to
// Activity[] (effects is Record<string, number>).
const childhoodActivities = activitiesData as unknown as Activity[];

// Synchronous getter; data is resolved at import time
export function loadChildhoodActivities(): Activity[] {
  return childhoodActivities;
}
