// nfl/activities_loader.ts - Load NFL activities from activities.json
//
// Activities are imported at bundle time by esbuild (resolveJsonModule),
// so the data is available synchronously without any preload step.

import type { Activity } from "../../activities.js";
import activitiesData from "./activities.json";

// Cast through unknown: inferred JSON literal types are too narrow for Activity[].
const nflActivities = activitiesData as unknown as Activity[];

//============================================
export function loadNflActivities(): Activity[] {
  return [...nflActivities];
}
